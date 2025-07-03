const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/admin.middleware');

// Dashboard Analytics
router.get('/dashboard/overview', requireAdmin, adminController.getDashboardOverview);
router.get('/analytics/charts', requireAdmin, adminController.getAnalyticsData);

// User Management  
router.get('/users', requireAdmin, adminController.getAllUsers);
router.get('/users/:id', requireAdmin, adminController.getUserDetail);

// Movie Management (Products)
router.get('/movies', requireAdmin, adminController.getAllMovies);

// Rental Management (Orders)
router.get('/rentals', requireAdmin, adminController.getAllRentals);

// Chart data endpoints (compatible with admin template)
router.get('/totalusers', requireAdmin, adminController.getTotalUsers);
router.get('/totalproducts', requireAdmin, adminController.getTotalProducts);
router.get('/totalrevenue', requireAdmin, adminController.getTotalRevenue);

// System monitoring endpoints
router.get('/system/status', requireAdmin, adminController.getSystemStatus);

// Genre CRUD operations
router.get('/genres', requireAdmin, adminController.getAllGenres);
router.post('/genres', requireAdmin, adminController.createGenre);
router.put('/genres/:id', requireAdmin, adminController.updateGenre);
router.delete('/genres/:id', requireAdmin, adminController.deleteGenre);
router.put('/genres/:id/status', requireAdmin, adminController.updateGenreStatus);

// WebSocket management
router.get('/websocket/connections', requireAdmin, adminController.getWebSocketConnections);

module.exports = router; 