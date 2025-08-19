require('dotenv').config();
// Prefer IPv4 and public DNS to avoid local DNS/IPv6 issues
try {
    const dns = require('dns');
    dns.setDefaultResultOrder('ipv4first');
    dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch (_) { }

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const tempRouter = require('./routes/tempr');
const authRouter = require('./routes/authRoutes');
const theatreRouter = require('./routes/theatreRoutes');
const screenRouter = require('./routes/screenRoutes');
const movieRouter = require('./routes/movieRoutes');
const showRouter = require('./routes/showRoutes');
const showSeatController = require('./routes/showSeatRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const errorHandler = require('./utils/errorHandler');
const pool = require('./config/db');
let redis; // lazy import to avoid connecting when not needed

const app = express();
// Behind Vercel/Proxies so req.secure and IPs work correctly
app.set('trust proxy', 1);

// CORS configuration: allow local dev or configured origins in production
const isProd = process.env.NODE_ENV === 'production';
const corsOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const corsOptions = {
    origin: isProd
        ? function (origin, callback) {
            // Allow non-browser clients (no origin) and configured origins
            if (!origin || corsOrigins.includes(origin)) {
                return callback(null, true);
            }
            // Do not throw; disable CORS for this request
            return callback(null, false);
        }
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

app.use(cors(corsOptions));
// Handle CORS preflight for all routes
// Express 5: use RegExp for wildcard preflight handling
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (!isProd) {
    app.use(morgan('dev'));
}

app.use((req, res, next) => {
    console.log('HI i am middleware 😀');
    next();
});

// Routes
app.use('/api/v1/temp', tempRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/theatre', theatreRouter);
app.use('/api/v1/screen', screenRouter);
app.use('/api/v1/movie', movieRouter);
app.use('/api/v1/show', showRouter);
app.use('/api/v1/show-seats', showSeatController);
app.use('/api/v1/bookings', bookingRouter);
if (process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL || process.env.REDIS_URL_UPSTASH) {
    // Lazy import to avoid initializing Redis when not configured
    const paymentRouter = require('./routes/paymentRoutes');
    app.use('/api/v1/payments', paymentRouter);
} else {
    console.warn('⚠️  Payments route disabled: no Redis URL configured');
}

// Lightweight health check to debug serverless issues
app.get('/api/v1/health', async (req, res) => {
    const info = {
        status: 'ok',
        node: process.version,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
            has_UPSTASH_REDIS_URL: Boolean(process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL_UPSTASH),
            CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
        },
        checks: {
            db: null,
            redis: null,
        },
    };

    try {
        const { rows } = await pool.query('SELECT 1 as ok');
        info.checks.db = rows?.[0]?.ok === 1 ? 'ok' : 'fail';
    } catch (e) {
        info.checks.db = `fail: ${e.message}`;
    }

    try {
        if (!redis) redis = require('./config/redisClient');
        const pong = await redis.ping();
        info.checks.redis = pong === 'PONG' ? 'ok' : `fail: ${pong}`;
    } catch (e) {
        info.checks.redis = `fail: ${e.message}`;
    }

    res.json(info);
});

app.get('/', (request, response) => {
    response.json({ message: 'server running fine' });
});

// Global error handler
app.use(errorHandler);

// Optional: DB connectivity check on startup (non-blocking)
(async () => {
    try {
        const { rows } = await pool.query('SELECT NOW() as now');
        console.log('🗄️  Postgres ping OK at', rows[0].now);
    } catch (e) {
        console.error('❌ Postgres connection failed:', e.message);
    }
})();

module.exports = app;
