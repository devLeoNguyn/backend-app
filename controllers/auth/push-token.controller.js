const User = require('../../models/User');
const pushNotificationService = require('../../services/push-notification.service');

const registerPushToken = async (req, res) => {
  try {
    const { userId, expoPushToken, fcmToken } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId là bắt buộc'
      });
    }

    if (!expoPushToken && !fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'expoPushToken hoặc fcmToken là bắt buộc'
      });
    }

    // Validate the token using the push notification service
    const result = await pushNotificationService.registerFCMToken(userId, fcmToken || expoPushToken);

    res.status(200).json({
      success: true,
      message: 'Push tokens registered successfully',
      data: {
        userId: result._id,
        pushNotificationsEnabled: result.pushNotificationsEnabled,
        notificationSettings: result.notificationSettings,
        hasExpoToken: !!result.expoPushToken,
        hasFcmToken: !!result.fcmToken
      }
    });
  } catch (error) {
    console.error('Error in registerPushToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering push tokens',
      error: error.message
    });
  }
};

// Endpoint mới để xử lý FCM token riêng biệt
const registerFCMToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId là bắt buộc'
      });
    }

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'fcmToken là bắt buộc'
      });
    }

    // Validate the token using the push notification service
    const result = await pushNotificationService.registerFCMToken(userId, fcmToken);

    res.status(200).json({
      success: true,
      message: 'FCM token registered successfully and expo token removed',
      data: {
        userId: result._id,
        pushNotificationsEnabled: result.pushNotificationsEnabled,
        notificationSettings: result.notificationSettings,
        hasFcmToken: !!result.fcmToken,
        hasExpoToken: false
      }
    });
  } catch (error) {
    console.error('Error in registerFCMToken:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering FCM token',
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
  registerFCMToken,
  updateNotificationSettings
};