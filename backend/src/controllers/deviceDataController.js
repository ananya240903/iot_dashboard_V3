const service = require('../service');
// Automatically extract the function whether it was spread or nested in index.js
const { deviceDataService } = require('../service');
const redisClient = require('../config/redisClient');
const { withSWRCache } = require('../utils/swrCache');
const QueryStream = require('pg-query-stream');
const { pool } = require('../config/db');
const { streamQueryResponse } = require('../utils/streamHandler');

const getDeviceData = async (req, res) => {
    try {
        const result = await withSWRCache(
            'deviceData',
            () => deviceDataService.deviceData()
        );

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });

    } catch (error) {
        console.error("Error in getDeviceData Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch device data",
            error: error.message
        });
    }
}
const getDeviceDataById = async (req, res) => {
    try {
        const { data_id } = req.params;
        const result = await withSWRCache(
            `deviceData_${data_id}`,
            () => deviceDataService.getDeviceDataById(data_id)
        );
        
        if (!result.data) {
            return res.status(404).json({
                success: false,
                message: "Data not found"
            });
        }
        
        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getDeviceDataById Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch device data by ID",
            error: error.message
        });
    }
}

const getSensorDataByDeviceId = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { stream, before_timestamp, limit, has_alert, since_timestamp } = req.query;

        if (stream === 'true') {
            const { sql, values } = deviceDataService.buildSensorDataByDeviceIdQuery(device_id, before_timestamp, limit, has_alert, since_timestamp);
            await streamQueryResponse(res, sql, values);
            return;
        }

        const result = await withSWRCache(
            `sensorDataByDevice_${device_id}_${before_timestamp || ''}_${limit || ''}_${has_alert || ''}_${since_timestamp || ''}`,
            () => deviceDataService.getSensorDataByDeviceId(device_id, before_timestamp, limit, has_alert, since_timestamp)
        );
        
        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getSensorDataByDeviceId Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch sensor data by device ID",
            error: error.message
        });
    }
}

const getDeviceDataBulkByIds = async (req, res) => {
    try {
        const { data_ids, rsNo, position } = req.body;
        if (!data_ids || !Array.isArray(data_ids) || data_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "A non-empty array of data_ids is required"
            });
        }
        const flatDataIds = data_ids.flat();
        
        const data = await deviceDataService.getDeviceDataBulkByIds(flatDataIds, rsNo, position);
        
        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getDeviceDataBulkByIds Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch device data by IDs bulk",
            error: error.message
        });
    }
}

const getAllDeviceMaster = async (req, res) => {
    try {
        const result = await withSWRCache(
            'allDeviceMasterData_v2',
            () => deviceDataService.getAllDeviceMaster()
        );
        
        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getAllDeviceMaster Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch all device master data",
            error: error.message
        });
    }
}

const getFilteredSensorData = async (req, res) => {
    try {
        let { hasAlert, zone, connection_status, deviceId, deviceType, time, limit, before_timestamp, severity } = req.query;
        
        // Clean up parameters in case of trailing spaces or newlines from copy-pasting
        if (typeof zone === 'string') zone = zone.trim();
        if (typeof connection_status === 'string') connection_status = connection_status.trim();
        if (typeof deviceId === 'string') deviceId = deviceId.trim();
        if (typeof deviceType === 'string') deviceType = deviceType.trim();
        if (typeof hasAlert === 'string') hasAlert = hasAlert.trim();
        if (typeof time === 'string') time = time.trim();
        if (typeof limit === 'string') limit = limit.trim();
        if (typeof before_timestamp === 'string') before_timestamp = before_timestamp.trim();
        if (typeof severity === 'string') severity = severity.trim();

        const filters = { hasAlert, zone, connection_status, deviceId, deviceType, time, limit, before_timestamp, severity };

        if (req.query.stream === 'true') {
            const { sql, values } = deviceDataService.buildFilteredSensorDataQuery(filters);
            await streamQueryResponse(res, sql, values);
            return;
        }

        const cacheKey = `filteredSensorData_${JSON.stringify(filters)}`;

        const result = await withSWRCache(
            cacheKey,
            () => deviceDataService.getFilteredSensorData(filters)
        );
        
        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getFilteredSensorData Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch filtered sensor data",
            error: error.message
        });
    }
}

const getAllSensorData = async (req, res) => {
    try {
        const { stream, before_timestamp, limit, time, startDate, endDate, deviceType, search, vendor } = req.query;

        let parsedDeviceTypes = null;
        if (deviceType) {
            parsedDeviceTypes = deviceType.split(',').map(t => t.trim()).filter(Boolean);
            if (parsedDeviceTypes.length === 0) parsedDeviceTypes = null;
        }
        
        let parsedVendors = null;
        if (vendor) {
            parsedVendors = vendor.split(',').map(t => t.trim()).filter(Boolean);
            if (parsedVendors.length === 0) parsedVendors = null;
        }

        const filters = { before_timestamp, limit, time, startDate, endDate, deviceType: parsedDeviceTypes, search, vendor: parsedVendors };

        if (stream === 'true') {
            const { sql, values } = deviceDataService.buildAllSensorDataQuery(filters);
            await streamQueryResponse(res, sql, values);
            return;
        }

        const cacheKey = `allSensorData_${JSON.stringify(filters)}`;

        const result = await withSWRCache(
            cacheKey,
            () => deviceDataService.getAllSensorData(filters)
        );
        
        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getAllSensorData Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch all sensor data",
            error: error.message
        });
    }
}

module.exports = {
    getDeviceData,
    getDeviceDataById,
    getDeviceDataBulkByIds,
    getAllDeviceMaster,
    getFilteredSensorData,
    getSensorDataByDeviceId,
    getAllSensorData
};