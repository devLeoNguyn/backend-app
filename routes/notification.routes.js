const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { 
  validateUserId, 
  validateNotificationId
} = require('../validators/notification.validator');

// Public user notifications routes
router.get('/', validateUserId, notificationController.getUserNotifications);
router.get('/unread-count', validateUserId, notificationController.getUnreadCount);
router.get('/:id', validateNotificationId, validateUserId, notificationController.getNotificationById);
router.put('/:id/read', validateNotificationId, notificationController.markNotificationAsRead);
router.delete('/:id', validateNotificationId, notificationController.deleteNotification);

module.exports = router;
