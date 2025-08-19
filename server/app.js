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
const paymentRouter = require('./routes/paymentRoutes');
const errorHandler = require('./utils/errorHandler');
const pool = require('./config/db');

const app = express();

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
            return callback(new Error('Not allowed by CORS'));
        }
        : true,
    credentials: true,
};

app.use(cors(corsOptions));
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
app.use('/api/v1/payments', paymentRouter);

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
