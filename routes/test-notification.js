const express = require('express');
const router = express.Router();
const { sendPushNotification } = require('../services/push-notification.service');
const User = require('../models/User');

// Test endpoint to send notification directly with push token
router.post('/send-test', async (req, res) => {
  try {
    const { pushToken, title, body } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Create a mock notification object for testing
    const mockNotification = {
      _id: 'test-notification-id',
      title: title || 'Test Notification',
      body: body || 'This is a test notification from backend',
      type: 'general',
      deep_link: null
    };

    const result = await sendPushNotification(pushToken, mockNotification);

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Test endpoint to send notification to all users with push tokens
router.post('/send-to-all', async (req, res) => {
  try {
    const { title, body } = req.body;
    
    // Find all users with push tokens
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${users.length} users with FCM tokens`);
    
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users with FCM tokens found',
        data: { sent: 0, failed: 0 }
      });
    }
    
    // Create notification record in database first
    const notificationService = require('../services/notification.service');
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found for creating notification');
      return res.status(500).json({
        success: false,
        message: 'No admin user found'
      });
    }
    
    // Create notification record in database
    const notificationData = {
      title: title || '🔥 FCM Test',
      body: body || 'Testing FCM notification delivery',
      type: 'manual',
      event_type: 'test',
      target_type: 'all',
      deep_link: null,
      priority: 'high',
      created_by: adminUser._id
    };
    
    const notification = await notificationService.createNotification(notificationData);
    console.log('✅ Test notification created in database:', notification._id);
    
    // Send push notifications and create UserNotification records
    const result = await notificationService.sendNotification(notification._id);
    
    console.log(`✅ Test notification sent: ${result.sentCount} success, ${result.failedCount} failed`);
    
    res.json({
      success: true,
      message: `Test notifications sent to ${result.sentCount} users, ${result.failedCount} failed`,
      data: {
        notificationId: notification._id,
        sent: result.sentCount,
        failed: result.failedCount,
        total: result.sentCount + result.failedCount
      }
    });
  } catch (error) {
    console.error('Send to all error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});

// Test endpoint to check users with push tokens
router.get('/users-with-tokens', async (req, res) => {
  try {
    const users = await User.find({
      fcmToken: { $exists: true, $ne: null }
    }).select('_id full_name email fcmToken pushNotificationsEnabled');
    
    const userStats = {
      total: users.length,
      withFcmToken: users.filter(u => u.fcmToken).length,
      users: users.map(user => ({
        id: user._id,
        name: user.full_name,
        email: user.email,
        hasFcmToken: !!user.fcmToken,
        pushEnabled: user.pushNotificationsEnabled
      }))
    };
    
    res.json({
      success: true,
      data: userStats
    });
  } catch (error) {
    console.error('Error getting users with tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users with tokens',
      error: error.message
    });
  }
});

module.exports = router;
