const express = require('express');
const router = express.Router();
const liveAlertsController = require('../../controllers/liveAlertsController');

router.get('/', liveAlertsController.getLiveAlerts);
router.get('/device-types', liveAlertsController.getDeviceTypes);
router.get('/sites', liveAlertsController.getSites);
router.get('/vendors', liveAlertsController.getVendors);
router.get('/severities', liveAlertsController.getSeverities);
router.get('/stream', liveAlertsController.streamLiveAlerts);

module.exports = router;
