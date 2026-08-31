const express = require('express');
const deviceDataRoutes = require('./deviceDataRoutes');
const deviceMasterRoutes = require('./deviceMasterRoutes');
const rsCategoryRoutes = require('./rsCategoryRoutes');
const liveAlertsRoutes = require('./liveAlertsRoutes');
const analysisRoutes = require('./analysisRoutes');
const router = express.Router();

router.use('/Deviceinformation', deviceDataRoutes);
router.use('/DeviceMasterinformation', deviceMasterRoutes);
router.use('/RsCategory', rsCategoryRoutes);
router.use('/LiveAlerts', liveAlertsRoutes);
router.use('/Analysis', analysisRoutes);
module.exports = router;
