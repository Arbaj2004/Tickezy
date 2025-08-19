const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const redis = require('../config/redisClient');

// Create seats for a show (bulk insert)
exports.createShowSeats = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid show_id or seats array', 400));
    }

    const values = seats.map(seat => `(${show_id}, '${seat.trim().toUpperCase()}')`).join(', ');

    try {
        await pool.query(`
            INSERT INTO show_seats (show_id, seat_label)
            VALUES ${values}
            ON CONFLICT (show_id, seat_label) DO NOTHING
        `);

        res.status(201).json({
            status: 'success',
            message: 'Seats added for the show'
        });
    } catch (err) {
        console.error('❌ Error creating show seats:', err);
        return next(new AppError('Failed to insert seats', 500));
    }
});

// Get seats for a show with hold status from Redis
exports.getSeatsByShow = catchAsync(async (req, res, next) => {
    const { showId } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM show_seats WHERE show_id = $1 ORDER BY seat_label`,
            [showId]
        );

        if (result.rowCount === 0) {
            return next(new AppError('No seats found for this show', 404));
        }

        const seats = result.rows;
        // Single-key per hold (no value); need to detect by SCAN for any user id
        // Pattern: hold:show:<showId>:<SEAT_LABEL>:*
        // To avoid many scans, collect seat labels and check existence per seat for any user
        const seatLabels = seats.map(seat => seat.seat_label.toUpperCase());
        // For each seat, check if any key exists for this show and seat
        for (let i = 0; i < seats.length; i++) {
            const label = seatLabels[i];
            const scanRes = await redis.scan('0', 'MATCH', `hold:show:${showId}:${label}:*`, 'COUNT', 1);
            const anyKey = scanRes[1] && scanRes[1].length > 0;
            if (anyKey && seats[i].status === 'available') {
                seats[i].status = 'hold';
            }
        }

        res.status(200).json({
            status: 'success',
            count: seats.length,
            data: seats
        });

    } catch (err) {
        console.error('❌ Error fetching seats:', err);
        return next(new AppError('Failed to fetch seats', 500));
    }
});

// Book seats for a show
exports.bookSeats = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;
    const bookingUserId = req.user && req.user.id;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid input data', 400));
    }

    const client = await pool.connect();
    const lockedSeats = [];

    try {
        for (const seat of seats) {
            const cleanedSeat = seat.trim().toUpperCase();
            const lockKey = `lock:show:${show_id}:seat:${cleanedSeat}`;

            const locked = await redis.set(lockKey, 'locked', 'NX', 'EX', 10);
            if (!locked) {
                for (const key of lockedSeats) await redis.del(key);
                throw new AppError(`Seat ${cleanedSeat} is being booked by someone else. Try again.`, 409);
            }

            lockedSeats.push(lockKey);
        }

        await client.query('BEGIN');

        for (const seat of seats) {
            const cleanedSeat = seat.trim().toUpperCase();

            const res = await client.query(
                `UPDATE show_seats SET status = 'booked'
                 WHERE show_id = $1 AND seat_label = $2 AND status = 'available'`,
                [show_id, cleanedSeat]
            );

            if (res.rowCount === 0) {
                throw new AppError(`Seat ${cleanedSeat} is already booked`, 400);
            }

            // Remove hold key(s) if present (for any user)
            let cursor = '0';
            do {
                const reply = await redis.scan(cursor, 'MATCH', `hold:show:${show_id}:${cleanedSeat}:*`, 'COUNT', 100);
                cursor = reply[0];
                const keys = reply[1];
                if (keys.length > 0) await redis.del(...keys);
            } while (cursor !== '0');
        }

        await client.query('COMMIT');

        res.status(200).json({
            status: 'success',
            message: 'Seats booked successfully'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Booking error:', err);

        res.status(err.statusCode || 500).json({
            status: 'error',
            message: err.message || 'Booking failed'
        });

    } finally {
        client.release();
        for (const lockKey of lockedSeats) await redis.del(lockKey);
    }
});
// Get current holds for authenticated user
exports.getUserHolds = catchAsync(async (req, res, next) => {
    // With single-key storage, compute user's holds by scanning (bounded)
    const user_id = String(req.user.id);
    try {
        let cursor = '0';
        const holds = [];
        do {
            const reply = await redis.scan(cursor, 'MATCH', 'hold:show:*:seat:*', 'COUNT', 100);
            cursor = reply[0];
            const keys = reply[1];
            if (keys.length > 0) {
                const values = await redis.mget(...keys);
                keys.forEach((key, idx) => {
                    if (values[idx] === user_id) {
                        // key format: hold:show:<show_id>:seat:<seat_label>
                        const parts = key.split(':');
                        const showId = Number(parts[2]);
                        const seatLabel = parts[4];
                        holds.push({ show_id: showId, seat_label: seatLabel });
                    }
                });
            }
        } while (cursor !== '0' && holds.length < 1000); // guard to avoid huge scans

        const total = holds.length;
        const byShow = holds.reduce((acc, h) => {
            acc[h.show_id] = (acc[h.show_id] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({ status: 'success', total, by_show: byShow, data: holds });
    } catch (err) {
        console.error('❌ Error getting user holds:', err);
        return next(new AppError('Failed to get user holds', 500));
    }
});

// Hold seats temporarily for a user
exports.holdSeats = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;
    const user_id = req.user.id;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid input', 400));
    }

    try {
        const createdKeys = [];
        for (const seat of seats) {
            const cleanedSeat = seat.trim().toUpperCase();
            // single unique key per hold: hold:show:<show_id>:<seat_label>:<user_id>
            const key = `hold:show:${show_id}:${cleanedSeat}:${user_id}`;
            const res = await redis.set(key, '1', 'NX', 'EX', 300);
            if (!res) {
                // if someone else already holds, rollback and error
                if (createdKeys.length > 0) await redis.del(...createdKeys);
                return next(new AppError(`Seat ${cleanedSeat} is already held`, 409));
            }
            createdKeys.push(key);
        }
        res.status(200).json({ status: 'success', message: 'Seats held for 5 minutes', data: seats });
    } catch (err) {
        console.error('❌ Error holding seats:', err);
        return next(new AppError('Failed to hold seats', 500));
    }
});

// Release holds for current user for specific seats (best-effort)
exports.releaseHolds = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;
    const user_id = req.user.id;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid input', 400));
    }

    try {
        const keys = seats.map(s => `hold:show:${show_id}:${String(s).trim().toUpperCase()}:${user_id}`);
        // Best-effort delete
        await redis.del(...keys);
        res.status(200).json({ status: 'success', message: 'Holds released' });
    } catch (err) {
        console.error('❌ Error releasing holds:', err);
        return next(new AppError('Failed to release holds', 500));
    }
});
