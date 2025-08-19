const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,           // e.g., postgres
    host: process.env.PG_HOST,           // e.g., localhost
    database: process.env.PG_DATABASE,   // e.g., Tickezy
    password: process.env.PG_PASSWORD,   // your DB password
    port: process.env.PG_PORT || 5432,   // default PostgreSQL port
});

pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL DB');
});

module.exports = pool;
