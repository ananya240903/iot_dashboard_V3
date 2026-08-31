const liveAlertsService = require('../service/liveAlertsService');
const { withSWRCache } = require('../utils/swrCache');

const getLiveAlerts = async (req, res) => {
    try {
        const { since, before_timestamp, after_timestamp, limit, deviceTypes, sortDirection, sites, vendors, severity } = req.query;

        let parsedDeviceTypes = null;
        if (deviceTypes) {
            parsedDeviceTypes = deviceTypes.split(',').map(t => t.trim()).filter(Boolean);
            if (parsedDeviceTypes.length === 0) parsedDeviceTypes = null;
        }

        let parsedSites = null;
        if (sites) {
            parsedSites = sites.split(',').map(s => s.trim()).filter(Boolean);
            if (parsedSites.length === 0) parsedSites = null;
        }

        let parsedVendors = null;
        if (vendors) {
            parsedVendors = vendors.split(',').map(v => v.trim()).filter(Boolean);
            if (parsedVendors.length === 0) parsedVendors = null;
        }

        let parsedSeverity = null;
        if (severity) {
            parsedSeverity = severity.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
            if (parsedSeverity.length === 0) parsedSeverity = null;
        }

        const result = await withSWRCache(
            `liveAlerts_${since || 'all'}_${before_timestamp || 'latest'}_${after_timestamp || 'none'}_${deviceTypes || 'all'}_${sortDirection || 'desc'}_${sites || 'all'}_${vendors || 'all'}_${severity || 'all'}`,
            () => liveAlertsService.getLiveAlerts(since, before_timestamp, parsedDeviceTypes, limit ? parseInt(limit, 10) : 1000, sortDirection, after_timestamp, parsedSites, parsedVendors, parsedSeverity)
        );

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error fetching Live Alerts:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch live alerts",
            error: error.message
        });
    }
};

const streamLiveAlerts = async (req, res) => {
    try {
        const { since } = req.query;

        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const cursor = liveAlertsService.streamLiveAlerts(since, 100);

        cursor.on('data', (doc) => {
            res.write(JSON.stringify(doc));
            const canContinue = res.write('\n');
            if (!canContinue) {
                cursor.pause();
                res.once('drain', () => cursor.resume());
            }
        });

        cursor.on('error', (err) => {
            console.error("Cursor error during stream:", err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, error: "Stream failed" });
            } else {
                res.end('{"stream_error":"Stream interrupted"}\n');
            }
        });

        cursor.on('end', () => {
            res.end();
        });

    } catch (error) {
        console.error("Error starting Live Alerts stream:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};


const getDeviceTypes = async (req, res) => {
    try {
        const result = await withSWRCache('allDeviceTypes', () => liveAlertsService.getAllDeviceTypes());
        return res.status(200).json({ success: true, source: result.source, data: result.data });
    } catch (error) {
        console.error("Error fetching device types:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch device types", error: error.message });
    }
};

const getSites = async (req, res) => {
    try {
        const result = await withSWRCache('allSites', () => liveAlertsService.getAllSites());
        return res.status(200).json({ success: true, source: result.source, data: result.data });
    } catch (error) {
        console.error("Error fetching sites:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch sites", error: error.message });
    }
};

const getVendors = async (req, res) => {
    try {
        const result = await withSWRCache('allVendors', () => liveAlertsService.getAllVendors());
        return res.status(200).json({ success: true, source: result.source, data: result.data });
    } catch (error) {
        console.error("Error fetching vendors:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch vendors", error: error.message });
    }
};

const getSeverities = async (req, res) => {
    try {
        const result = await withSWRCache('allSeverities', () => liveAlertsService.getAllSeverities());
        return res.status(200).json({ success: true, source: result.source, data: result.data });
    } catch (error) {
        console.error("Error fetching severities:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch severities", error: error.message });
    }
};

module.exports = {
    getLiveAlerts,
    streamLiveAlerts,
    getDeviceTypes,
    getSites,
    getVendors,
    getSeverities
};
