const { Pool } = require('pg');
require('dotenv').config();

let pool;

const commonOpts = {
    // Keep pool modest; Supabase pooler limits connections
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS) || 10000,
    keepAlive: true,
    allowExitOnIdle: false,
    // Optional statement/query timeouts to avoid stuck clients
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 60000,
    query_timeout: Number(process.env.PG_QUERY_TIMEOUT_MS) || 60000,
};

if (process.env.DATABASE_URL) {
    // Supabase / Cloud DB
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Supabase
        ...commonOpts,
    });
} else {
    // Local DB fallback
    pool = new Pool({
        user: process.env.PG_USER || 'postgres',
        host: process.env.PG_HOST || 'localhost',
        database: process.env.PG_DATABASE || 'postgres',
        password: process.env.PG_PASSWORD || 'postgres',
        port: Number(process.env.PG_PORT) || 5432,
        ssl:
            process.env.PG_SSL === 'true' || process.env.PGSSLMODE === 'require'
                ? { rejectUnauthorized: false }
                : undefined,
        ...commonOpts,
    });
}

// Log when connected
pool.on('connect', () => {
    if (process.env.DATABASE_URL) {
        const url = new URL(process.env.DATABASE_URL);
        console.log(
            `✅ Connected to Supabase PostgreSQL @ ${url.hostname}:${url.port || 5432} / ${url.pathname.replace('/', '')}`
        );
    } else {
        console.log(`✅ Connected to local PostgreSQL DB`);
    }
});

// Prevent crashes on unexpected client errors (e.g., db restarts / idle terminations)
pool.on('error', (err) => {
    console.error('⚠️  Postgres pool error (handled):', err.message);
});

module.exports = pool;
