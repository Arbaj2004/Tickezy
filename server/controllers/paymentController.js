const pool = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const redis = require('../config/redisClient');
const crypto = require('crypto');

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

// POST /payments/session
exports.createSession = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const { show_id, seats, amount } = req.body;
    if (!show_id || !Array.isArray(seats) || seats.length === 0 || !amount) {
        return next(new AppError('Missing required fields', 400));
    }

    // First: validate DB availability for precise messaging
    const labels = seats.map(s => String(s).trim().toUpperCase());
    const q = await pool.query(
        `SELECT seat_label, status FROM show_seats WHERE show_id = $1 AND seat_label = ANY($2)`,
        [show_id, labels]
    );
    if (q.rowCount !== labels.length) {
        return next(new AppError('Some seats do not exist for this show', 404));
    }
    const statusMap = new Map(q.rows.map(r => [String(r.seat_label).toUpperCase(), String(r.status).toLowerCase()]));
    const booked = labels.find(l => statusMap.get(l) === 'booked');
    if (booked) return next(new AppError(`Seat ${booked} already booked`, 409));
    const blocked = labels.find(l => statusMap.get(l) === 'blocked');
    if (blocked) return next(new AppError(`Seat ${blocked} is blocked`, 409));
    const otherNA = labels.find(l => statusMap.get(l) && statusMap.get(l) !== 'available');
    if (otherNA) return next(new AppError(`Seat ${otherNA} not available`, 409));

    // Then: require seats to be held by this user before creating a session
    for (const seat of seats) {
        const seatLabel = seat.trim().toUpperCase();
        const holdKey = `hold:show:${show_id}:${seatLabel}`;
        const owner = await redis.get(holdKey);
        if (String(owner) !== String(user_id)) {
            return next(new AppError(`Seat ${seatLabel} not held by user or hold expired`, 403));
        }
    }

    const sessionId = `pay_${newId()}`;
    const sessionKey = `pay:session:${sessionId}`;
    const payload = {
        user_id,
        show_id,
        seats: seats.map(s => s.trim().toUpperCase()),
        amount: Number(amount),
        created_at: Date.now()
    };
    await redis.set(sessionKey, JSON.stringify(payload), 'EX', 300);

    res.status(201).json({ status: 'success', session_id: sessionId, expires_in: 300 });
});

// GET /payments/session/:id
exports.getSession = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const sessionId = req.params.id;
    const sessionKey = `pay:session:${sessionId}`;
    const raw = await redis.get(sessionKey);
    if (!raw) return next(new AppError('Session not found or expired', 404));
    const data = JSON.parse(raw);
    if (String(data.user_id) !== String(user_id)) return next(new AppError('Forbidden', 403));
    const ttl = await redis.ttl(sessionKey);
    res.status(200).json({ status: 'success', ttl: Math.max(ttl, 0), data });
});

// POST /payments/confirm
exports.confirm = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const { session_id, payment_method } = req.body; // payment_method is ignored in dummy mode
    if (!session_id) return next(new AppError('session_id is required', 400));

    const sessionKey = `pay:session:${session_id}`;
    const raw = await redis.get(sessionKey);
    if (!raw) return next(new AppError('Payment session expired', 410));
    const sess = JSON.parse(raw);
    if (String(sess.user_id) !== String(user_id)) return next(new AppError('Forbidden', 403));

    const { show_id, seats, amount } = sess;
    const client = await pool.connect();

    try {
        // Re-verify holds by checking owner
        for (const seat of seats) {
            const holdKey = `hold:show:${show_id}:${seat}`;
            const owner = await redis.get(holdKey);
            if (String(owner) !== String(user_id)) {
                return next(new AppError(`Seat ${seat} not held or hold expired`, 409));
            }
        }

        await client.query('BEGIN');
        // Create booking
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, show_id, total_amount, status, payment_id)
       VALUES ($1, $2, $3, 'confirmed', $4)
       RETURNING *`,
            [user_id, show_id, amount, `dummy_${session_id}`]
        );
        const bookingId = bookingResult.rows[0].id;

        // Mark seats as booked and record booking_seats
        for (const seat of seats) {
            const updateResult = await client.query(
                `UPDATE show_seats SET status = 'booked'
         WHERE show_id = $1 AND seat_label = $2 AND status = 'available'`,
                [show_id, seat]
            );
            if (updateResult.rowCount === 0) {
                return next(new AppError(`Seat ${seat} already booked`, 409));
            }
            await client.query(
                `INSERT INTO booking_seats (booking_id, seat_label, show_id) VALUES ($1, $2, $3)`,
                [bookingId, seat, show_id]
            );
        }

        await client.query('COMMIT');

        // Cleanup hold keys
        for (const seat of seats) {
            const holdKey = `hold:show:${show_id}:${seat}`;
            const owner = await redis.get(holdKey);
            if (String(owner) === String(user_id)) {
                await redis.del(holdKey);
            }
        }

        // Delete session
        await redis.del(sessionKey);

        res.status(200).json({ status: 'success', data: bookingResult.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Payment confirm error:', err);
        // Cleanup holds and session on error
        try {
            for (const seat of (sess?.seats || [])) {
                const cleanedSeat = seat.replace(/\s+/g, '').toUpperCase();
                const key = `hold:show:${sess.show_id}:${cleanedSeat}`;
                await redis.del(key);
            }
            await redis.del(sessionKey);
        } catch (_) { /* best-effort */ }
        return next(new AppError(err.message || 'Payment failed', err.statusCode || 500));
    } finally {
        client.release();
    }
});

// POST /payments/cancel
// Cancels a payment session: releases seat holds and deletes the session
exports.cancel = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;
    const { session_id } = req.body;
    if (!session_id) return next(new AppError('session_id is required', 400));

    const sessionKey = `pay:session:${session_id}`;
    const raw = await redis.get(sessionKey);
    if (!raw) {
        // Session already expired; nothing to release most likely
        return res.status(200).json({ status: 'success', message: 'Session already expired' });
    }

    const sess = JSON.parse(raw);
    if (String(sess.user_id) !== String(user_id)) return next(new AppError('Forbidden', 403));

    const { show_id, seats } = sess;

    // Best-effort delete of hold keys
    for (const seat of seats) {
        const holdKey = `hold:show:${show_id}:${seat}`;
        const owner = await redis.get(holdKey);
        if (String(owner) === String(user_id)) {
            await redis.del(holdKey);
        }
    }

    // Delete session key
    await redis.del(sessionKey);

    res.status(200).json({ status: 'success', message: 'Payment cancelled and holds released' });
});
