const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// CREATE
exports.createTheatre = catchAsync(async (req, res, next) => {
    const { name, location, city, contact_email } = req.body;

    const result = await pool.query(
        `INSERT INTO theatres (name, location, city, contact_email)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [name, location, city, contact_email]
    );

    res.status(201).json({
        status: 'success',
        data: result.rows[0]
    });
});

// READ ALL
exports.getAllTheatres = catchAsync(async (req, res, next) => {
    const result = await pool.query('SELECT * FROM theatres ORDER BY created_at DESC');

    res.status(200).json({
        status: 'success',
        results: result.rowCount,
        data: result.rows
    });
});

// READ ONE
exports.getTheatre = catchAsync(async (req, res, next) => {
    const result = await pool.query('SELECT * FROM theatres WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
        return next(new AppError('No theatre found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// UPDATE
exports.updateTheatre = catchAsync(async (req, res, next) => {
    const { name, location, city, contact_email } = req.body;

    const result = await pool.query(
        `UPDATE theatres
     SET name = $1,
         location = $2,
         city = $3,
         contact_email = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
        [name, location, city, contact_email, req.params.id]
    );

    if (result.rowCount === 0) {
        return next(new AppError('No theatre found to update', 404));
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// DELETE
exports.deleteTheatre = catchAsync(async (req, res, next) => {
    const result = await pool.query('DELETE FROM theatres WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rowCount === 0) {
        return next(new AppError('No theatre found to delete', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
