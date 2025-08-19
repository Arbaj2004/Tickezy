const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create a new movie
exports.createMovie = catchAsync(async (req, res, next) => {
    const {
        title,
        description,
        duration_minutes,
        release_date,
        language,
        rating,
        poster_url,
        trailer_url
    } = req.body;

    const result = await pool.query(
        `INSERT INTO movies (
      title, description, duration_minutes, release_date,
      language, rating, poster_url, trailer_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [title, description, duration_minutes, release_date, language, rating, poster_url, trailer_url]
    );

    res.status(201).json({
        status: 'success',
        data: result.rows[0]
    });
});

// Get all movies
exports.getAllMovies = catchAsync(async (req, res, next) => {
    const result = await pool.query(`SELECT * FROM movies ORDER BY created_at DESC`);
    res.status(200).json({
        status: 'success',
        results: result.rowCount,
        data: result.rows
    });
});

// Get movie by ID
exports.getMovieById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await pool.query(`SELECT * FROM movies WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
        return next(new AppError('Movie not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// Update a movie
exports.updateMovie = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const {
        title,
        description,
        duration_minutes,
        release_date,
        language,
        rating,
        poster_url,
        trailer_url
    } = req.body;

    const result = await pool.query(
        `UPDATE movies SET
      title = $1,
      description = $2,
      duration_minutes = $3,
      release_date = $4,
      language = $5,
      rating = $6,
      poster_url = $7,
      trailer_url = $8,
      updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
        [title, description, duration_minutes, release_date, language, rating, poster_url, trailer_url, id]
    );

    if (result.rowCount === 0) {
        return next(new AppError('Movie not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// Delete a movie
exports.deleteMovie = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await pool.query(`DELETE FROM movies WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
        return next(new AppError('Movie not found', 404));
    }

    res.status(204).json({ status: 'success', data: null });
});
