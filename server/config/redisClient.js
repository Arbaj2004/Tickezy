// config/redisClient.js
const Redis = require('ioredis');

// Prefer Upstash URL if provided; support both rediss:// and redis://
const upstashUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL_UPSTASH;
const localUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connectionUrl = upstashUrl || localUrl;

const redis = new Redis(connectionUrl, {
    // Upstash typically requires TLS; ioredis detects rediss:// automatically,
    // but if the URL is redis:// with tls flag, we can still enforce it via options.
    tls: connectionUrl.startsWith('rediss://') ? {} : undefined,
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

module.exports = redis;
