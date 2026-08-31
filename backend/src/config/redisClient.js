const { createClient } = require('redis');

// Create Redis Client
// By default it connects to redis://localhost:6379
const redisClient = createClient({
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    socket: {
        reconnectStrategy: (retries, error) => {
            const msg = error ? (error.message || String(error)) : '';
            // If the server doesn't support HELLO (Redis < 6), stop reconnecting
            if (/unknown command ['`"]HELLO['`"]/i.test(msg)) {
                return new Error('Fatal error: Redis server does not support HELLO command.');
            }
            // Otherwise reconnect with a backoff strategy
            return Math.min(retries * 50, 2000);
        }
    }
});
let hasLoggedError = false;

redisClient.on('error', (err) => {
    // Suppress the 'HELLO' command error from spamming the terminal.
    // This happens because node-redis v4 expects Redis v6+, but Windows often runs Redis v3.
    const msg = err.message || String(err);
    if (/(unknown command ['`"]HELLO['`"]|Fatal error: Redis server does not support HELLO command)/i.test(msg)) {
        return;
    }
    
    if (!hasLoggedError) {
        console.error('Redis Client Error (will keep retrying silently):', err);
        hasLoggedError = true;
    }
});

redisClient.on('connect', () => {
    hasLoggedError = false; // Reset the flag if connection is successful
    console.log('Connected to Redis');
});

// Initialize connection safely without crashing the app if Redis isn't running yet
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        const msg = err.message || String(err);
        if (!/(unknown command ['`"]HELLO['`"]|Fatal error: Redis server does not support HELLO command)/i.test(msg)) {
            console.error('Failed to connect to Redis initially. The app will continue without caching.', msg);
        }
    }
})();

module.exports = redisClient;
