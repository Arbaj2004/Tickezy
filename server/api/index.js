// Vercel Serverless entrypoint that wraps our Express app
const app = require('../app');

module.exports = (req, res) => {
    try {
        return app(req, res);
    } catch (err) {
        console.error('❌ Unhandled serverless error:', err);
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ status: 'error', message: 'Internal Server Error' }));
    }
};
