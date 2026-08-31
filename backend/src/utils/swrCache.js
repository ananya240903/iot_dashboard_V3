const redisClient = require('../config/redisClient');

async function doBackgroundRefresh(cacheKey, fetchFunction, hardTtlSec) {
    try {
        const newData = await fetchFunction();
        const staleAt = Date.now() + (300 * 1000);
        await redisClient.setEx(cacheKey, hardTtlSec, JSON.stringify({ data: newData, staleAt }));
    } catch (err) {
        console.error(`Background refresh failed for ${cacheKey}`, err);
    }
}

const withSWRCache = async (cacheKey, fetchFunction, staleTtlSec = 300, hardTtlSec = 3600) => {
    const lockKey = `lock_${cacheKey}`;
    const lockTtlSec = 10;

    if (redisClient.isReady) {
        const cachedString = await redisClient.get(cacheKey);
        if (cachedString) {
            try {
                const cachedData = JSON.parse(cachedString);
                const now = Date.now();
                if (now < cachedData.staleAt) {
                    return { source: 'cache', data: cachedData.data };
                }
                doBackgroundRefresh(cacheKey, fetchFunction, hardTtlSec).catch(console.error);
                return { source: 'cache (stale)', data: cachedData.data };
            } catch (err) {
                console.error(`Error parsing cached data for ${cacheKey}`, err);
            }
        }
    }

    if (redisClient.isReady) {
        const acquiredLock = await redisClient.set(lockKey, 'locked', { NX: true, EX: lockTtlSec });
        if (acquiredLock) {
            try {
                const data = await fetchFunction();
                const staleAt = Date.now() + (staleTtlSec * 1000);
                try {
                    await redisClient.setEx(cacheKey, hardTtlSec, JSON.stringify({ data, staleAt }));
                    await redisClient.del(lockKey);
                } catch (e) {
                    await redisClient.del(lockKey);
                }
                return { source: 'database', data };
            } catch (err) {
                await redisClient.del(lockKey);
                throw err;
            }
        } else {
            // Poll for the cache result while the lock is held (up to 50 times * 100ms = 5 seconds)
            for (let i = 0; i < 50; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const newlyCachedData = await redisClient.get(cacheKey);
                if (newlyCachedData) {
                    return { source: 'cache (waited)', data: JSON.parse(newlyCachedData).data };
                }
            }

            // If it's still missing after 5 seconds, throw an error to prevent DB overload (Cache Stampede)
            throw new Error(`Cache timeout for ${cacheKey}. Database is likely overloaded.`);
        }
    }

    // Only fallback if redis is not ready
    if (!redisClient.isReady) {
        const fallbackData = await fetchFunction();
        return { source: 'database (no redis)', data: fallbackData };
    }

    throw new Error(`Unexpected cache fall-through for ${cacheKey}`);
};

module.exports = {
    withSWRCache
};
