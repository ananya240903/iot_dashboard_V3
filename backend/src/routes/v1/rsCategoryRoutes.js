const express = require('express');
const router = express.Router();
const rsCategoryController = require('../../controllers/rsCategoryController');

router.get('/alerts/by-category', rsCategoryController.getAlertsByCategory);
router.get('/alerts/repeated-by-category', rsCategoryController.getRepeatedAlertsByCategory);
router.get('/alerts/search/:rsNo', rsCategoryController.searchAlertsByRsNo);

module.exports = router;
