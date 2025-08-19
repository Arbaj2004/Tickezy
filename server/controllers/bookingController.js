const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const redis = require('../config/redisClient');
const crypto = require('crypto');

exports.createBooking = catchAsync(async (req, res, next) => {
    const { show_id, seats, total_amount, payment_id } = req.body;
    const user_id = req.user.id;

    if (!show_id || !seats || seats.length === 0 || !total_amount || !payment_id) {
        return next(new AppError('Missing required booking details', 400));
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Verify user holds the seats
        for (const seat of seats) {
            const seatLabel = seat.trim().toUpperCase();
            const holdKey = `hold:show:${show_id}:${seatLabel}`;
            const owner = await redis.get(holdKey);
            if (String(owner) !== String(user_id)) {
                throw new AppError(`Seat ${seatLabel} is not held by you or hold expired`, 403);
            }
        }

        // Step 2: Create booking entry
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, show_id, total_amount, status, payment_id)
             VALUES ($1, $2, $3, 'confirmed', $4)
             RETURNING *`,
            [user_id, show_id, total_amount, payment_id]
        );

        const bookingId = bookingResult.rows[0].id;

        // Step 3: Mark seats as booked and record in booking_seats
        for (const seat of seats) {
            const seatLabel = seat.trim().toUpperCase();

            const updateResult = await client.query(
                `UPDATE show_seats
                 SET status = 'booked'
                 WHERE show_id = $1 AND seat_label = $2 AND status = 'available'`,
                [show_id, seatLabel]
            );

            if (updateResult.rowCount === 0) {
                throw new AppError(`Seat ${seatLabel} is already booked`, 400);
            }

            await client.query(
                `INSERT INTO booking_seats (booking_id, seat_label, show_id)
                 VALUES ($1, $2, $3)`,
                [bookingId, seatLabel, show_id]
            );
        }

        await client.query('COMMIT');

        // Step 4: Clear Redis seat holds
        for (const seat of seats) {
            const seatLabel = seat.trim().toUpperCase();
            const holdKey = `hold:show:${show_id}:${seatLabel}`;
            const owner = await redis.get(holdKey);
            if (String(owner) === String(user_id)) {
                await redis.del(holdKey);
            }
        }

        res.status(201).json({
            status: 'success',
            message: 'Booking completed successfully',
            data: bookingResult.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Booking failed:', err);

        res.status(err.statusCode || 500).json({
            status: 'error',
            message: err.message || 'Booking failed'
        });
    } finally {
        client.release();
    }
});

// Get all bookings (admin use)
exports.getAllBookings = catchAsync(async (req, res, next) => {
    const result = await pool.query(
        `SELECT b.*, u.name AS user_name, m.title AS movie_title, t.name AS theatre_name
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         JOIN shows s ON b.show_id = s.id
         JOIN movies m ON s.movie_id = m.id
         JOIN screens sc ON s.screen_id = sc.id
         JOIN theatres t ON sc.theatre_id = t.id
         ORDER BY b.booked_at DESC`
    );

    res.status(200).json({
        status: 'success',
        count: result.rowCount,
        data: result.rows
    });
});

// Get bookings of the current user
exports.getMyBookings = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const result = await pool.query(
        `SELECT 
            b.*, 
            m.title AS movie_title, 
            t.name AS theatre_name, 
            s.show_datetime,
            COALESCE(
                ARRAY_AGG(bs.seat_label ORDER BY bs.seat_label) 
                FILTER (WHERE bs.seat_label IS NOT NULL),
                '{}'
            ) AS seats
         FROM bookings b
         JOIN shows s ON b.show_id = s.id
         JOIN movies m ON s.movie_id = m.id
         JOIN screens sc ON s.screen_id = sc.id
         JOIN theatres t ON sc.theatre_id = t.id
         LEFT JOIN booking_seats bs ON bs.booking_id = b.id
         WHERE b.user_id = $1
         GROUP BY b.id, m.title, t.name, s.show_datetime
         ORDER BY b.booked_at DESC`,
        [userId]
    );

    res.status(200).json({
        status: 'success',
        count: result.rowCount,
        data: result.rows
    });
});

// Get one booking (owner or admin)
exports.getBookingById = catchAsync(async (req, res, next) => {
    const bookingId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await pool.query(
        `SELECT 
            b.*, 
            s.movie_id,
            s.screen_id,
            sc.name AS screen_name,
            sc.theatre_id,
            t.name AS theatre_name,
            t.city AS theatre_city,
            t.location AS theatre_location,
            m.title AS movie_title,
            s.show_datetime,
            COALESCE(
                ARRAY_AGG(bs.seat_label ORDER BY bs.seat_label) 
                FILTER (WHERE bs.seat_label IS NOT NULL),
                '{}'
            ) AS seats
         FROM bookings b
         JOIN shows s ON b.show_id = s.id
         JOIN movies m ON s.movie_id = m.id
         JOIN screens sc ON s.screen_id = sc.id
         JOIN theatres t ON sc.theatre_id = t.id
         LEFT JOIN booking_seats bs ON bs.booking_id = b.id
         WHERE b.id = $1
         GROUP BY b.id, s.movie_id, s.screen_id, sc.name, sc.theatre_id, t.name, t.city, t.location, m.title, s.show_datetime`,
        [bookingId]
    );

    if (result.rowCount === 0) return next(new AppError('Booking not found', 404));
    const booking = result.rows[0];
    if (String(booking.user_id) !== String(userId) && userRole !== 'Admin') {
        return next(new AppError('Forbidden', 403));
    }
    // Ensure booking is paid before exposing details to non-admins
    if (userRole !== 'Admin' && booking.status && !['confirmed', 'completed'].includes(String(booking.status).toLowerCase())) {
        return next(new AppError('Booking not paid', 403));
    }

    // Create a simple HMAC for QR integrity (do not expose secret)
    const payload = {
        booking_id: booking.id,
        user_id: booking.user_id,
        show_id: booking.show_id,
        theatre_id: booking.theatre_id,
        screen_id: booking.screen_id,
        seats: booking.seats,
        ts: Date.now()
    };
    const secret = process.env.QR_SIGNING_SECRET || 'dev-qr-secret';
    const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify({
            booking_id: payload.booking_id,
            user_id: payload.user_id,
            show_id: payload.show_id,
            theatre_id: payload.theatre_id,
            screen_id: payload.screen_id,
            seats: payload.seats
        }))
        .digest('hex');

    res.status(200).json({
        status: 'success',
        data: {
            ...booking,
            qr_payload: { ...payload, sig: signature }
        }
    });
});

// Admin analytics
exports.getAnalytics = catchAsync(async (req, res, next) => {
    try {
        const qTotalRevenue = pool.query(
            `SELECT COALESCE(SUM(total_amount), 0)::bigint AS total_revenue
             FROM bookings
             WHERE status IN ('confirmed','completed')`
        );

        const qTotalBookings = pool.query(
            `SELECT COUNT(*)::bigint AS total_bookings FROM bookings`
        );

        const qActiveShows = pool.query(
            `SELECT COUNT(*)::bigint AS active_shows FROM shows WHERE status = 'active'`
        );

        const qRevenueByMovie = pool.query(
            `SELECT m.title AS movie, COALESCE(SUM(b.total_amount),0)::bigint AS revenue
             FROM bookings b
             JOIN shows s ON b.show_id = s.id
             JOIN movies m ON s.movie_id = m.id
             GROUP BY m.title
             ORDER BY revenue DESC
             LIMIT 10`
        );

        const qBookingsByCity = pool.query(
            `SELECT COALESCE(t.city, 'Unknown') AS city, COUNT(b.id)::bigint AS bookings
             FROM bookings b
             JOIN shows s ON b.show_id = s.id
             JOIN screens sc ON s.screen_id = sc.id
             JOIN theatres t ON sc.theatre_id = t.id
             GROUP BY city
             ORDER BY bookings DESC`
        );

        const qRevenueByDay = pool.query(
            `SELECT TO_CHAR((b.booked_at AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
                    COALESCE(SUM(b.total_amount),0)::bigint AS revenue
             FROM bookings b
             WHERE b.booked_at >= NOW() - INTERVAL '30 days'
             GROUP BY day
             ORDER BY day`
        );

        const qSeatsSold = pool.query(`SELECT COUNT(*)::bigint AS sold FROM booking_seats`);
        const qSeatsAvailable = pool.query(`SELECT COUNT(*)::bigint AS available FROM show_seats WHERE status = 'available'`);

        const qTopTheatres = pool.query(
            `SELECT t.name AS theatre, COALESCE(SUM(b.total_amount),0)::bigint AS revenue
             FROM bookings b
             JOIN shows s ON b.show_id = s.id
             JOIN screens sc ON s.screen_id = sc.id
             JOIN theatres t ON sc.theatre_id = t.id
             GROUP BY t.name
             ORDER BY revenue DESC
             LIMIT 10`
        );

        const [
            totalRevenueRes,
            totalBookingsRes,
            activeShowsRes,
            revenueByMovieRes,
            bookingsByCityRes,
            revenueByDayRes,
            seatsSoldRes,
            seatsAvailableRes,
            topTheatresRes
        ] = await Promise.all([
            qTotalRevenue,
            qTotalBookings,
            qActiveShows,
            qRevenueByMovie,
            qBookingsByCity,
            qRevenueByDay,
            qSeatsSold,
            qSeatsAvailable,
            qTopTheatres
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                totals: {
                    revenue: Number(totalRevenueRes.rows[0]?.total_revenue || 0),
                    bookings: Number(totalBookingsRes.rows[0]?.total_bookings || 0),
                    active_shows: Number(activeShowsRes.rows[0]?.active_shows || 0)
                },
                revenue_by_movie: revenueByMovieRes.rows,
                bookings_by_city: bookingsByCityRes.rows,
                revenue_by_day: revenueByDayRes.rows,
                seats: {
                    sold: Number(seatsSoldRes.rows[0]?.sold || 0),
                    available: Number(seatsAvailableRes.rows[0]?.available || 0)
                },
                top_theatres: topTheatresRes.rows
            }
        });
    } catch (err) {
        console.error('❌ Error generating analytics:', err);
        return next(new AppError('Failed to generate analytics', 500));
    }
});
