const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { requireAdmin } = require('../middlewares/admin.middleware');

// Analytics Routes - Revenue Management
router.get('/dashboard', requireAdmin, analyticsController.getRevenueDashboard);
router.get('/trends', requireAdmin, analyticsController.getRevenueTrends);
router.get('/top-movies', requireAdmin, analyticsController.getTopMoviesByRevenue);
router.get('/rental-distribution', requireAdmin, analyticsController.getRentalTypeDistribution);

module.exports = router;
