const { query } = require('../config/db');

async function getDeviceDetailsById(device_id) {
    try {
        const sql = `SELECT * FROM iotms.device_master WHERE device_id = $1`;
        const result = await query(sql, [device_id]);
        return result.rows[0] || null;
    } catch (error) {
        console.log("Error fetching device details by ID", error);
        throw error;
    }
}

async function getAllVendors() {
    const sql = `SELECT DISTINCT vendor_name FROM iotms.vendor_master WHERE vendor_name IS NOT NULL ORDER BY vendor_name ASC`;
    try {
        const result = await query(sql);
        return result.rows.map(row => row.vendor_name);
    } catch (error) {
        console.error("Error fetching vendors:", error);
        throw error;
    }
}

module.exports = {
    getDeviceDetailsById,
    getAllVendors
};
