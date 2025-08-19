const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create a show
exports.createShow = catchAsync(async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { movie_id, screen_id, show_datetime, price } = req.body;

        await client.query('BEGIN');

        const showResult = await client.query(
            `INSERT INTO shows (movie_id, screen_id, show_datetime, price)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [movie_id, screen_id, show_datetime, price]
        );

        const show = showResult.rows[0];

        // Get layout from screens
        const layoutResult = await client.query(
            `SELECT layout FROM screens WHERE id = $1`,
            [screen_id]
        );

        if (layoutResult.rowCount === 0) {
            throw new AppError('Screen layout not found', 404);
        }

        const layout = layoutResult.rows[0].layout;
        const seatLabels = layout
            .filter(item => item.type === 'seat')
            .map(item => item.label.trim().toUpperCase());

        const values = seatLabels.map(seat => `(${show.id}, '${seat}')`).join(', ');

        await client.query(`
            INSERT INTO show_seats (show_id, seat_label)
            VALUES ${values}
            ON CONFLICT (show_id, seat_label) DO NOTHING
        `);

        await client.query('COMMIT');

        res.status(201).json({
            status: 'success',
            data: show
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error creating show:', err);
        return next(new AppError('Failed to create show', 500));
    } finally {
        client.release();
    }
});
// Get all shows
exports.getAllShows = catchAsync(async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT s.*, m.title AS movie_title, sc.name AS screen_name, sc.theatre_id, t.name AS theatre_name
            FROM shows s
            JOIN movies m ON s.movie_id = m.id
            JOIN screens sc ON s.screen_id = sc.id
            JOIN theatres t ON sc.theatre_id = t.id
            ORDER BY s.show_datetime
        `);

        res.status(200).json({ status: 'success', results: result.rowCount, data: result.rows });
    } catch (err) {
        console.error('❌ Error fetching shows:', err);
        return next(new AppError('Failed to fetch shows', 500));
    }
});

// Get a show by ID
exports.getShowById = catchAsync(async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT s.*, m.title AS movie_title, sc.name AS screen_name, sc.theatre_id, t.name AS theatre_name
            FROM shows s
            JOIN movies m ON s.movie_id = m.id
            JOIN screens sc ON s.screen_id = sc.id
            JOIN theatres t ON sc.theatre_id = t.id
            WHERE s.id = $1
            ORDER BY s.show_datetime
        `, [req.params.id]);

        console.log('Show details:', result.rows[0]);
        if (result.rowCount === 0)
            return next(new AppError('Show not found', 404));
        console.log(result.rows[0]);
        res.status(200).json({ status: 'success', data: result.rows[0] });
    } catch (err) {
        console.error('❌ Error fetching show by ID:', err);
        return next(new AppError('Failed to get show', 500));
    }
});

// Update a show
exports.updateShow = catchAsync(async (req, res, next) => {
    try {
        const { movie_id, screen_id, show_datetime, price, status } = req.body;

        const result = await pool.query(
            `UPDATE shows SET
                movie_id = $1,
                screen_id = $2,
                show_datetime = $3,
                price = $4,
                status = $5,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 RETURNING *`,
            [movie_id, screen_id, show_datetime, price, status || 'active', req.params.id]
        );

        if (result.rowCount === 0)
            return next(new AppError('Show not found', 404));

        res.status(200).json({ status: 'success', data: result.rows[0] });
    } catch (err) {
        console.error('❌ Error updating show:', err);
        return next(new AppError('Failed to update show', 500));
    }
});

// Delete a show
exports.deleteShow = catchAsync(async (req, res, next) => {
    try {
        const result = await pool.query(`DELETE FROM shows WHERE id = $1 RETURNING *`, [req.params.id]);

        if (result.rowCount === 0)
            return next(new AppError('Show not found', 404));

        res.status(204).json({ status: 'success', data: null });
    } catch (err) {
        console.error('❌ Error deleting show:', err);
        return next(new AppError('Failed to delete show', 500));
    }
});


exports.getMovieDetailsWithShows = catchAsync(async (req, res) => {
    const movieId = req.params.id;
    const rawCity = (req.query.city || '').toString().trim();
    const city = rawCity.length > 0 ? `%${rawCity.toLowerCase()}%` : null;

    try {
        // Fetch movie details
        const movieQuery = `
      SELECT * FROM movies WHERE id = $1
    `;
        const movieResult = await pool.query(movieQuery, [movieId]);

        if (movieResult.rowCount === 0) {
            return res.status(404).json({ error: "Movie not found" });
        }

        const movie = movieResult.rows[0];

        // Fetch all related shows with theatre info
        let showQuery = `
            SELECT 
                theatres.id AS theatre_id,
                theatres.name AS theatre_name,
                theatres.location AS address,
                theatres.city AS city,
                shows.id AS show_id,
                shows.screen_id AS screen_id,
                shows.show_datetime,
                shows.price
            FROM shows
            JOIN screens ON shows.screen_id = screens.id
            JOIN theatres ON screens.theatre_id = theatres.id
            WHERE shows.movie_id = $1 AND shows.status = 'active'
        `;

        const params = [movieId];
        if (city) {
            showQuery += ` AND (
                LOWER(theatres.location) LIKE $2
                OR LOWER(theatres.name) LIKE $2
                OR LOWER(theatres.city) LIKE $2
            )`;
            params.push(city);
        }
        showQuery += ` ORDER BY theatres.id, shows.show_datetime`;

        const showResult = await pool.query(showQuery, params);

        // Group by theatre
        const theatreMap = {};

        // Formatter to compute date in IST (YYYY-MM-DD)
        const istDateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        showResult.rows.forEach(row => {
            const {
                theatre_id,
                theatre_name,
                address,
                show_id,
                screen_id,
                show_datetime,
                price
            } = row;

            // Compute show date in IST to match frontend grouping and user expectations
            const showDate = new Date(show_datetime);
            const showDateString = istDateFormatter.format(showDate); // YYYY-MM-DD in IST

            if (!theatreMap[theatre_id]) {
                theatreMap[theatre_id] = {};
            }

            if (!theatreMap[theatre_id][showDateString]) {
                theatreMap[theatre_id][showDateString] = {
                    id: theatre_id,
                    name: theatre_name,
                    address,
                    city,
                    show_date: showDateString,
                    showtimes: []
                };
            }

            // Format time in IST
            const timeFormatted = showDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata' // Indian Standard Time
            });

            theatreMap[theatre_id][showDateString].showtimes.push({
                id: show_id,
                screen_id,
                time: timeFormatted,
                price: Number(price),
                datetime: show_datetime
            });
        });

        // Flatten the nested structure for response
        const theatresList = [];
        Object.values(theatreMap).forEach(theatre => {
            Object.values(theatre).forEach(dateGroup => {
                theatresList.push(dateGroup);
            });
        });

        const response = {
            ...movie,
            theatres: theatresList
        };
        console.log(response);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching movie details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
