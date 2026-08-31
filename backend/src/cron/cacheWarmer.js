const cron = require('node-cron');
const { rsCategoryService, deviceDataService } = require('../service');
const redisClient = require('../config/redisClient');

// --- BACKGROUND CACHE WARMER (Scheduled Cron Job) ---
// Runs in the background to ensure the API responds instantly and never blocks on DB queries
const FRESH_TTL_MS = 5 * 60 * 1000; // 5 mins fresh
const HARD_TTL_SEC = 86400; // 24 hours hard expiration

const warmUpCategoryAlertsCache = async () => {
    try {
        if (redisClient.isReady) {
            const staleAt = Date.now() + FRESH_TTL_MS;

            console.log("[Cron Job] Starting background refresh of Alerts By Category...");
            const data = await rsCategoryService.getAlertsByCategory();
            await redisClient.setEx('alertsByCategory', HARD_TTL_SEC, JSON.stringify({ data, staleAt }));
            console.log("[Cron Job] Successfully refreshed Alerts By Category.");

            console.log("[Cron Job] Starting background refresh of Repeated Alerts By Category...");
            const repeatedData = await rsCategoryService.getRepeatedAlertsByCategory();
            await redisClient.setEx('repeatedAlertsByCategory', HARD_TTL_SEC, JSON.stringify({ data: repeatedData, staleAt }));
            console.log("[Cron Job] Successfully refreshed Repeated Alerts By Category.");

            console.log("[Cron Job] Starting background refresh of Device Data...");
            const dData = await deviceDataService.deviceData();
            await redisClient.setEx('deviceData', HARD_TTL_SEC, JSON.stringify({ data: dData, staleAt }));
            console.log("[Cron Job] Successfully refreshed Device Data.");
        }
    } catch (error) {
        console.error("[Cron Job] Failed to refresh cache:", error.message);
    }
};

const initCronJobs = () => {
    console.log("[Cron Job] Initializing Scheduled Jobs...");

    // Schedule the cron job to run every 5 minutes
    cron.schedule('*/5 * * * *', warmUpCategoryAlertsCache, {
        scheduled: true,
        timezone: "Asia/Kolkata" // using IST timezone
    });

    // Run once on startup after 5 seconds to pre-warm the cache immediately
    setTimeout(warmUpCategoryAlertsCache, 5000);
};

module.exports = {
    initCronJobs
};
