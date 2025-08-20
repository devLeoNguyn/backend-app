const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { requireAdmin } = require('../middlewares/admin.middleware');

// Analytics Routes - Revenue Management
router.get('/dashboard', requireAdmin, analyticsController.getRevenueDashboard);
router.get('/trends', requireAdmin, analyticsController.getRevenueTrends);
router.get('/top-movies', requireAdmin, analyticsController.getTopMoviesByRevenue);
router.get('/rental-distribution', requireAdmin, analyticsController.getRentalTypeDistribution);

// Customer Analytics Routes - Repeat, Churn
router.get('/repeat-rate', requireAdmin, analyticsController.getRepeatPurchaseRate);
router.get('/churn-rate', requireAdmin, analyticsController.getChurnRate);
router.get('/top-customers', requireAdmin, analyticsController.getTopCustomers);

// Movie Views Analytics Routes - Top/Low Views
router.get('/top-movies-by-views', requireAdmin, analyticsController.getTopMoviesByViews);
router.get('/low-view-movies', requireAdmin, analyticsController.getLowViewMovies);

module.exports = router;
