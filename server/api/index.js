// Vercel Serverless entrypoint that wraps our Express app
const app = require('../app');
module.exports = (req, res) => app(req, res);
