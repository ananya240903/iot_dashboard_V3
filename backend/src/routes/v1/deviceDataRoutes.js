const express = require('express');
const router = express.Router();
const deviceDataController = require('../../controllers/deviceDataController');

router.get('/device-data', deviceDataController.getDeviceData);
router.get('/data/:data_id', deviceDataController.getDeviceDataById);
router.post('/data/bulk', deviceDataController.getDeviceDataBulkByIds);
router.get('/device-locations', deviceDataController.getAllDeviceMaster);
router.get('/filtered-sensor-data', deviceDataController.getFilteredSensorData);
router.get('/device/:device_id/data', deviceDataController.getSensorDataByDeviceId);
router.get('/all-sensor-data', deviceDataController.getAllSensorData);

module.exports = router;
