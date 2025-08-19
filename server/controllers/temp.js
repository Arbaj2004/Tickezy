const pool = require('../config/db');
exports.testDB = async (req, res) => {
    console.log(req.body)
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({
            status: "success",
            message: `🕒 DB connected: ${result.rows[0].now}`
        });
    } catch (err) {
        console.error('❌ DB Test Error:', err);
        res.status(500).json({
            status: "error",
            message: 'DB connection failed'
        });
    }
};
