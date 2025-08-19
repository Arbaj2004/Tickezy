const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// CREATE screen
exports.createScreen = catchAsync(async (req, res, next) => {
    console.log('Creating screen with body:');
    const { name, total_seats, layout } = req.body;
    console.log('Creating screen with body:');
    const { theatreId } = req.params;
    console.log('Creating screen with body:');
    console.log(req.body);

    const result = await pool.query(
        `INSERT INTO screens (theatre_id, name, total_seats, layout)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [theatreId, name, total_seats, layout]
    );

    res.status(201).json({
        status: 'success',
        data: result.rows[0]
    });
});

// GET all screens for a theatre
exports.getScreensByTheatre = catchAsync(async (req, res, next) => {
    const { theatreId } = req.params;

    const result = await pool.query(
        `SELECT * FROM screens WHERE theatre_id = $1 ORDER BY id ASC`,
        [theatreId]
    );
    if (result.rowCount === 0) {
        return next(new AppError('Screen not found', 404));
    }
    res.status(200).json({
        status: 'success',
        results: result.rows.length,
        data: result.rows
    });
});

// GET single screen
exports.getScreen = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM screens WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
        return next(new AppError('Screen not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// UPDATE screen
exports.updateScreen = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, total_seats, layout } = req.body;

    const result = await pool.query(
        `UPDATE screens
     SET name = $1, total_seats = $2, layout = $3
     WHERE id = $4
     RETURNING *`,
        [name, total_seats, layout, id]
    );

    if (result.rowCount === 0) {
        return next(new AppError('No screen found to update', 404));
    }

    res.status(200).json({
        status: 'success',
        data: result.rows[0]
    });
});

// DELETE screen
exports.deleteScreen = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const result = await pool.query(`DELETE FROM screens WHERE id = $1 RETURNING *`, [id]);

    if (result.rowCount === 0) {
        return next(new AppError('No screen found to delete', 404));
    }

    res.status(204).json({ status: 'success', data: null });
});
// GET all screens
exports.getAllScreens = catchAsync(async (req, res, next) => {
    const result = await pool.query(`SELECT * FROM screens ORDER BY id ASC`);

    res.status(200).json({
        status: 'success',
        results: result.rowCount,
        data: result.rows
    });
});