module.exports = (err, req, res, next) => {
    // console.error("Error:", err); // Log the error in the backend for debugging

    // Set default status code and message
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    // Send a JSON response
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
    });
};
