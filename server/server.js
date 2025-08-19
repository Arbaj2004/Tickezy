require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const tempRouter = require('./routes/tempr');
const authRouter = require('./routes/authRoutes');
const theatreRouter = require('./routes/theatreRoutes');
const screenRouter = require('./routes/screenRoutes');
const movieRouter = require('./routes/movieRoutes');
const showRouter = require('./routes/showRoutes');
const showSeatController = require('./routes/showSeatRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const morgan = require('morgan');
const errorHandler = require('./utils/errorHandler');

// You can configure it further if needed, e.g., app.use(cors({ origin: 'http://example.com' }));
app.use(cors({
    origin: 'http://localhost:5173', // Replace with your frontend URL, no trailing slash
    credentials: true
}));
app.use(express.json());                         // 👈 Handles JSON req bodies
app.use(express.urlencoded({ extended: true })); // 👈 Handles form data
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}
app.use((req, res, next) => {
    console.log("HI i am middleware 😀");
    next();
});

app.use("/api/v1/temp", tempRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/theatre", theatreRouter);
app.use("/api/v1/screen", screenRouter);
app.use("/api/v1/movie", movieRouter);
app.use("/api/v1/show", showRouter);
app.use("/api/v1/show-seats", showSeatController);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRouter);

app.get("/", (request, response) => {
    response.json({
        message: "server running fine",
    });
});

// Global error handler (ensures consistent JSON responses on errors)
app.use(errorHandler);

console.log(process.env.MONGO_URL);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Tickezy backend running at http://localhost:${PORT}`);
});
