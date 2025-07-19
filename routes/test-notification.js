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
      expoPushToken: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${users.length} users with push tokens`);
    
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users with push tokens found',
        data: { sent: 0, failed: 0 }
      });
    }
    
    const results = [];
    let sent = 0;
    let failed = 0;
    
    for (const user of users) {
      try {
        const mockNotification = {
          _id: 'test-notification-id',
          title: title || 'Test Notification',
          body: body || 'This is a test notification to all users',
          type: 'general',
          deep_link: null
        };
        
        const result = await sendPushNotification(user.expoPushToken, mockNotification);
        results.push({ userId: user._id, token: user.expoPushToken, status: 'sent', result });
        sent++;
      } catch (error) {
        results.push({ userId: user._id, token: user.expoPushToken, status: 'failed', error: error.message });
        failed++;
      }
    }
    
    res.json({
      success: true,
      message: `Notifications sent to ${sent} users, ${failed} failed`,
      data: { sent, failed, results }
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
router.get('/check-tokens', async (req, res) => {
  try {
    const users = await User.find({
      expoPushToken: { $exists: true, $ne: null }
    }, { _id: 1, email: 1, expoPushToken: 1 });
    
    res.json({
      success: true,
      message: `Found ${users.length} users with push tokens`,
      data: users
    });
  } catch (error) {
    console.error('Check tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check tokens',
      error: error.message
    });
  }
});

module.exports = router;
