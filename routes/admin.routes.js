const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/admin.middleware');

// Import movie controller để sử dụng lại createMovieController
const { createMovieController, updateMovie, deleteMovie } = require('../controllers/movie.controller');

// Import notification controller
const notificationController = require('../controllers/admin/notification.controller');

// Import validators
const {
  validateCreateNotification,
  validateUpdateNotification,
  validateNotificationId,
  validateScheduleNotification,
  validateBulkOperation
} = require('../validators/notification.validator');

// Dashboard Analytics
router.get('/dashboard/overview', requireAdmin, adminController.getDashboardOverview);
router.get('/analytics/charts', requireAdmin, adminController.getAnalyticsData);

// User Management  
router.get('/users', requireAdmin, adminController.getAllUsers);
router.get('/users/:id', requireAdmin, adminController.getUserDetail);

// Movie Management (Products)
router.get('/movies', requireAdmin, adminController.getAllMovies);
router.post('/movies', requireAdmin, createMovieController); // Thêm phim mới với push notification
router.put('/movies/:id', requireAdmin, updateMovie); // Cập nhật phim
router.delete('/movies/:id', requireAdmin, deleteMovie); // Xóa phim

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

// Episode Management - CRUD operations
router.get('/episodes', requireAdmin, adminController.getEpisodesByMovie);
router.post('/episodes', requireAdmin, adminController.createEpisode);
router.put('/episodes/:id', requireAdmin, adminController.updateEpisode);
router.delete('/episodes/:id', requireAdmin, adminController.deleteEpisode);
router.post('/episodes/reorder', requireAdmin, adminController.reorderEpisodes);

// Notification Management - Validation first, then authentication
router.get('/notifications', requireAdmin, notificationController.getNotifications);
router.post('/notifications', validateCreateNotification, requireAdmin, notificationController.createNotification);
router.get('/notifications/stats', requireAdmin, notificationController.getNotificationStats);
router.post('/notifications/bulk-send', validateBulkOperation, requireAdmin, notificationController.bulkSendNotifications);
router.post('/notifications/bulk-delete', validateBulkOperation, requireAdmin, notificationController.bulkDeleteNotifications);
router.get('/notifications/:id', validateNotificationId, requireAdmin, notificationController.getNotificationById);
router.put('/notifications/:id', validateUpdateNotification, requireAdmin, notificationController.updateNotification);
router.delete('/notifications/:id', validateNotificationId, requireAdmin, notificationController.deleteNotification);
router.post('/notifications/:id/send', validateNotificationId, requireAdmin, notificationController.sendNotification);
router.post('/notifications/:id/schedule', validateNotificationId, validateScheduleNotification, requireAdmin, notificationController.scheduleNotification);

// Export the router
module.exports = router;