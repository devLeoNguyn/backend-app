const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/seriesController');

// Get trending series
router.get('/trending', seriesController.getTrendingSeries);

// Get action series
router.get('/action', seriesController.getActionSeries);

// Get Vietnamese series
router.get('/vietnamese', seriesController.getVietnameseSeries);

// Get anime series
router.get('/anime', seriesController.getAnimeSeries);

// Get series by ID
router.get('/:id', seriesController.getSeriesById);

// Banner
router.get('/banner', seriesController.getBannerSeries);

// Tab chọn quốc gia
router.get('/country-tabs', seriesController.getCountryTabs);


module.exports = router; 