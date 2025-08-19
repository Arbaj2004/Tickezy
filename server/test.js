const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
    .then(res => {
        console.log('✅ DB Connected:', res.rows[0]);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ DB Connection Failed:', err.message);
        process.exit(1);
    });
