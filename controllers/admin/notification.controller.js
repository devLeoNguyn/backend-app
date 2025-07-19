const notificationService = require('../../services/notification.service');
const User = require('../../models/User');
const mongoose = require('mongoose');

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, body, type, target_type, target_users, segment, 
            scheduled_at, deep_link, image_url, priority, expires_at, event_type } = req.body;
    
    // userId could be in body or query for flexibility
    const actualUserId = userId || req.query.userId;
    
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Create notification
    const notification = await notificationService.createNotification({
      title,
      body,
      type: type || 'manual',
      event_type,
      target_type,
      target_users,
      segment,
      scheduled_at,
      deep_link,
      image_url,
      priority,
      expires_at,
      created_by: actualUserId
    });

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

// Get all notifications with filters for admin
exports.getNotifications = async (req, res) => {
  try {
    // userId could be in body or query for flexibility
    const actualUserId = req.body.userId || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Extract filters from query params
    const filters = {
      status: req.query.status,
      type: req.query.type,
      event_type: req.query.event_type,
      target_type: req.query.target_type,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
      created_by: req.query.created_by
    };

    const result = await notificationService.getNotifications(filters, { page, limit });

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notifications',
      error: error.message
    });
  }
};

// Get notification details for admin
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    // userId could be in body or query for flexibility
    const actualUserId = req.body.userId || req.query.userId;
    
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const notification = await notificationService.getNotificationById(id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification retrieved successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Error getting notification details:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notification details',
      error: error.message
    });
  }
};

// Update a notification
exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    // userId could be in body or query for flexibility
    const actualUserId = req.body.userId || req.query.userId;
    const { title, body, target_type, target_users, segment, deep_link, image_url, priority, expires_at, status } = req.body;
    
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const notification = await notificationService.updateNotification(id, {
      title,
      body,
      target_type,
      target_users,
      segment,
      deep_link,
      image_url,
      priority,
      expires_at,
      status
    });
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or cannot be updated'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification updated successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error.message
    });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const result = await notificationService.deleteNotification(id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or cannot be deleted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

// Send notification immediately
exports.sendNotification = async (req, res) => {
  try {
    const { id } = req.params;
    // userId could be in body or query for flexibility
    const actualUserId = req.body.userId || req.query.userId;
    
    if (!actualUserId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const result = await notificationService.sendNotification(id);
    
    res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending notification',
      error: error.message
    });
  }
};

// Schedule notification for later
exports.scheduleNotification = async (req, res) => {
  try {
    const { id } = req.params;
    // userId could be in body or query for flexibility
    const actualUserId = req.body.userId || req.query.userId;
    const { scheduled_at } = req.body;
    
    if (!actualUserId || !scheduled_at) {
      return res.status(400).json({
        success: false,
        message: 'userId and scheduled_at are required'
      });
    }

    // Check if user is admin
    const user = await User.findById(actualUserId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const notification = await notificationService.scheduleNotification(id, new Date(scheduled_at));
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or cannot be scheduled'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification scheduled successfully',
      data: { notification }
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error scheduling notification',
      error: error.message
    });
  }
};

// Bulk send notifications
exports.bulkSendNotifications = async (req, res) => {
  try {
    const { userId, notification_ids } = req.body;
    
    if (!userId || !notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({
        success: false,
        message: 'userId and notification_ids array are required'
      });
    }

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await notificationService.bulkSendNotifications(notification_ids);
    
    res.status(200).json({
      success: true,
      message: 'Bulk send completed',
      data: result
    });
  } catch (error) {
    console.error('Error bulk sending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk sending notifications',
      error: error.message
    });
  }
};

// Bulk delete notifications
exports.bulkDeleteNotifications = async (req, res) => {
  try {
    const { userId, notification_ids } = req.body;
    
    if (!userId || !notification_ids || !Array.isArray(notification_ids)) {
      return res.status(400).json({
        success: false,
        message: 'userId and notification_ids array are required'
      });
    }

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const result = await notificationService.bulkDeleteNotifications(notification_ids);
    
    res.status(200).json({
      success: true,
      message: 'Bulk delete completed',
      data: result
    });
  } catch (error) {
    console.error('Error bulk deleting notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk deleting notifications',
      error: error.message
    });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Extract filters from query params
    const filters = {
      status: req.query.status,
      type: req.query.type,
      date_from: req.query.date_from,
      date_to: req.query.date_to
    };

    const stats = await notificationService.getNotificationStats(filters);

    res.status(200).json({
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error getting notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving notification statistics',
      error: error.message
    });
  }
};
