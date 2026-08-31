const { deviceMasterService } = require('../service');
const { withSWRCache } = require('../utils/swrCache');

const getDeviceDetails = async (req, res) => {
    try {
        const { device_id } = req.params;
        
        if (!device_id) {
            return res.status(400).json({ success: false, message: "Missing required parameter: device_id" });
        }

        const result = await withSWRCache(
            `deviceDetails_${device_id}`,
            () => deviceMasterService.getDeviceDetailsById(device_id)
        );

        if (!result.data) {
            return res.status(404).json({ success: false, message: "Device not found" });
        }

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getDeviceDetails Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch device details",
            error: error.message
        });
    }
}

const getVendors = async (req, res) => {
    try {
        const result = await withSWRCache('allVendors', () => deviceMasterService.getAllVendors());
        return res.status(200).json({ success: true, source: result.source, data: result.data });
    } catch (error) {
        console.error("Error fetching vendors:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch vendors", error: error.message });
    }
};

module.exports = {
    getDeviceDetails,
    getVendors
};
