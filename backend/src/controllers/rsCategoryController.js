const { rsCategoryService } = require('../service');
const { withSWRCache } = require('../utils/swrCache');

const getAlertsByCategory = async (req, res) => {
    try {
        const result = await withSWRCache(
            'alertsByCategory',
            () => rsCategoryService.getAlertsByCategory()
        );

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getAlertsByCategory Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch alerts by category",
            error: error.message
        });
    }
}

const getRepeatedAlertsByCategory = async (req, res) => {
    try {
        const result = await withSWRCache(
            'repeatedAlertsByCategory',
            () => rsCategoryService.getRepeatedAlertsByCategory()
        );
        console.log(`[Controller] Source for repeated alerts: ${result.source}`);

        return res.status(200).json({
            success: true,
            source: result.source,
            data: result.data
        });
    } catch (error) {
        console.error("Error in getRepeatedAlertsByCategory Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch repeated alerts by category",
            error: error.message
        });
    }
}

const searchAlertsByRsNo = async (req, res) => {
    try {
        const { rsNo } = req.params;

        if (!rsNo) {
            return res.status(400).json({
                success: false,
                message: "rsNo query parameter is required"
            });
        }

        const result = await withSWRCache(
            `rsCategorySearch_${rsNo}`,
            () => rsCategoryService.searchAlertsByRsNo(rsNo)
        );

        const data = result.data;

        // Map the new query output to the frontend's expected flat array structure
        let flatResults = [];
        let totalAlerts = 0;
        let totalComponents = 0;
        let totalNormal = 0;
        let totalDataIds = [];
        
        if (data && data.length > 0 && data[0].components) {
            const vehicleData = data[0];
            totalAlerts = vehicleData.total_has_alert_true || 0;
            totalComponents = vehicleData.total_components || 0;
            totalNormal = vehicleData.total_has_alert_false || 0;
            totalDataIds = vehicleData.all_data_ids || [];
            flatResults = vehicleData.components.map(comp => ({
                rsNo: vehicleData.vehicle_number,
                category: comp.category || "UNKNOWN",
                position: comp.position,
                hasAlert: comp.hasAlert,
                times: comp.count,
                data_id: comp.data_ids
            }));
        }

        return res.status(200).json({
            success: true,
            source: result.source,
            data: flatResults,
            totalAlerts: totalAlerts,
            totalComponents: totalComponents,
            totalNormal: totalNormal,
            totalDataIds: totalDataIds
        });
    } catch (error) {
        console.error("Error in searchAlertsByRsNo Controller:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to search alerts by rsNo",
            error: error.message
        });
    }
}

module.exports = {
    getAlertsByCategory,
    getRepeatedAlertsByCategory,
    searchAlertsByRsNo
};
