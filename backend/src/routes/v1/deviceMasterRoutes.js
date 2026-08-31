const express = require('express');
const router = express.Router();
const deviceMasterController = require('../../controllers/deviceMasterController');

router.get('/device-details/:device_id', deviceMasterController.getDeviceDetails);
router.get('/vendors', deviceMasterController.getVendors);

module.exports = router;
