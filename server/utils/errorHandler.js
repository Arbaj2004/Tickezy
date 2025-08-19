module.exports = (err, req, res, next) => {
    // Log detailed error in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Error:', err);
    }

    // Set default status code and message
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // Send a JSON response
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
};
