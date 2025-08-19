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
        // Check single hold key per seat: hold:show:<showId>:<SEAT_LABEL> (contains user_id)
        for (let i = 0; i < seats.length; i++) {
            const label = String(seats[i].seat_label).toUpperCase();
            const holdKey = `hold:show:${showId}:${label}`;
            const exists = await redis.exists(holdKey);
            if (exists && seats[i].status === 'available') {
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

            // Remove hold key if present (single key pattern)
            const holdKey = `hold:show:${show_id}:${cleanedSeat}`;
            await redis.del(holdKey);
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
// Get current holds for authenticated user (matches key: hold:show:<show_id>:<seat_label>)
exports.getUserHolds = catchAsync(async (req, res, next) => {
    const user_id = String(req.user.id);
    try {
        // Get all shows first
        const showsResult = await pool.query('SELECT id FROM shows');
        const holds = [];

        // Check each show for seats held by this user
        for (const show of showsResult.rows) {
            const seatsResult = await pool.query('SELECT label FROM show_seats WHERE show_id = $1', [show.id]);

            for (const seat of seatsResult.rows) {
                const cleanedSeat = seat.label.replace(/\s+/g, '').toUpperCase();
                const holdKey = `hold:show:${show.id}:${cleanedSeat}`;

                const heldByUserId = await redis.get(holdKey);
                if (heldByUserId === user_id) {
                    holds.push({ show_id: show.id, seat_label: seat.label });
                }
            }
        }

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
        const createdOrRefreshed = [];
        for (const seat of seats) {
            const label = seat.trim().toUpperCase();
            const holdKey = `hold:show:${show_id}:${label}`;

            // Check if seat is already held
            const currentOwner = await redis.get(holdKey);
            if (currentOwner && String(currentOwner) !== String(user_id)) {
                // Seat held by someone else
                return next(new AppError(`Seat ${label} is already held`, 409));
            }

            // Set/refresh hold for this user
            await redis.set(holdKey, String(user_id), 'EX', 300);
            createdOrRefreshed.push({ seat: label, action: currentOwner ? 'refreshed' : 'created' });
        }
        res.status(200).json({ status: 'success', message: 'Seats held for 5 minutes', data: createdOrRefreshed });
    } catch (err) {
        console.error('❌ Error holding seats:', err);
        return next(new AppError('Failed to hold seats', 500));
    }
});

// Validate then hold: for each seat ensure not booked and either already held by this user (refresh TTL) or acquire hold; fail if held by someone else
exports.validateThenHold = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;
    const user_id = req.user.id;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid input', 400));
    }

    try {
        // 1) Check DB availability for all seats
        const labels = seats.map(s => String(s).trim().toUpperCase());
        const q = await pool.query(
            `SELECT seat_label, status FROM show_seats WHERE show_id = $1 AND seat_label = ANY($2)`,
            [show_id, labels]
        );
        if (q.rowCount !== labels.length) {
            return next(new AppError('Some seats do not exist for this show', 404));
        }
        // Build status map for precise messaging
        const statusMap = new Map(q.rows.map(r => [String(r.seat_label).toUpperCase(), String(r.status).toLowerCase()]));
        // If any booked -> fail with exact message
        const booked = labels.find(l => statusMap.get(l) === 'booked');
        if (booked) {
            return res.status(409).json({ status: 'fail', message: `Seat ${booked} already booked` });
        }
        // If any blocked -> fail with exact message
        const blocked = labels.find(l => statusMap.get(l) === 'blocked');
        if (blocked) {
            return res.status(409).json({ status: 'fail', message: `Seat ${blocked} is blocked` });
        }
        // Any other non-available
        const otherNA = labels.find(l => statusMap.get(l) && statusMap.get(l) !== 'available');
        if (otherNA) {
            return res.status(409).json({ status: 'fail', message: `Seat ${otherNA} not available` });
        }

        // 2) Attempt to hold for this user
        const createdOrRefreshed = [];
        for (const label of labels) {
            const holdKey = `hold:show:${show_id}:${label}`;
            const currentOwner = await redis.get(holdKey);

            if (currentOwner && String(currentOwner) !== String(user_id)) {
                return res.status(409).json({ status: 'fail', message: `Seat ${label} is already held` });
            }

            // Set/refresh hold for this user
            await redis.set(holdKey, String(user_id), 'EX', 300);
            createdOrRefreshed.push({ seat: label, action: currentOwner ? 'refreshed' : 'created' });
        }

        return res.status(200).json({ status: 'success', message: 'Validated and held', data: createdOrRefreshed });
    } catch (err) {
        console.error('❌ Error validateThenHold:', err);
        return next(new AppError('Failed to validate and hold', 500));
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
        // Delete hold keys for seats owned by this user
        for (const s of seats) {
            const label = String(s).trim().toUpperCase();
            const holdKey = `hold:show:${show_id}:${label}`;
            const owner = await redis.get(holdKey);
            if (String(owner) === String(user_id)) {
                await redis.del(holdKey);
            }
        }
        res.status(200).json({ status: 'success', message: 'Holds released' });
    } catch (err) {
        console.error('❌ Error releasing holds:', err);
        return next(new AppError('Failed to release holds', 500));
    }
});

// Validate that provided seats are currently held by this user for a given show
exports.validateHolds = catchAsync(async (req, res, next) => {
    const { show_id, seats } = req.body;
    const user_id = req.user.id;

    if (!show_id || !Array.isArray(seats) || seats.length === 0) {
        return next(new AppError('Invalid input', 400));
    }

    try {
        const missing = [];
        for (const seat of seats) {
            const label = String(seat).trim().toUpperCase();
            const holdKey = `hold:show:${show_id}:${label}`;
            const owner = await redis.get(holdKey);
            if (String(owner) !== String(user_id)) {
                missing.push(label);
            }
        }
        if (missing.length > 0) {
            return res.status(409).json({ status: 'fail', message: 'Some seats are not held', missing });
        }
        return res.status(200).json({ status: 'success', ok: true });
    } catch (err) {
        console.error('❌ Error validating holds:', err);
        return next(new AppError('Failed to validate holds', 500));
    }
});
