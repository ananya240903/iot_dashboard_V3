const express = require('express');
const router = express.Router();
const analysisController = require('../../controllers/analysisController');

router.post('/trend', analysisController.getTrendAnalysis);
router.post('/variation-report', analysisController.getVariationReport);

module.exports = router;
