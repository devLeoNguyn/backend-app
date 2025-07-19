const User = require('../../models/User');
const { Expo } = require('expo-server-sdk');
const pushNotificationService = require('../../services/push-notification.service');

const registerPushToken = async (req, res) => {
  try {
    const { userId, expoPushToken } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId là bắt buộc'
      });
    }

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken là bắt buộc'
      });
    }

    // Validate the token using the push notification service
    const result = await pushNotificationService.registerPushToken(userId, expoPushToken);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        userId: result._id,
        pushNotificationsEnabled: result.pushNotificationsEnabled,
        notificationSettings: result.notificationSettings
      }
    });
  } catch (error) {
    console.error('Error in registerPushToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering push token',
      error: error.message
    });
  }
};

const updateNotificationSettings = async (req, res) => {
  try {
    const { userId, pushNotificationsEnabled, notificationSettings } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId là bắt buộc'
      });
    }

    // Use the push notification service
    const updatedSettings = await pushNotificationService.updateNotificationSettings(
      userId, 
      { 
        enabled: pushNotificationsEnabled, 
        ...notificationSettings 
      }
    );

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        userId,
        pushNotificationsEnabled: updatedSettings.pushNotificationsEnabled,
        notificationSettings: updatedSettings.notificationSettings
      }
    });
  } catch (error) {
    console.error('Error in updateNotificationSettings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification settings',
      error: error.message
    });
  }
};

module.exports = {
  registerPushToken,
  updateNotificationSettings
};