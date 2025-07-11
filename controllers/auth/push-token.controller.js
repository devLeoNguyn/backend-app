const User = require('../../models/User');
const { Expo } = require('expo-server-sdk');

const registerPushToken = async (req, res) => {
  try {
    const { expoPushToken, userId } = req.body;

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

    // Validate the token
    if (!Expo.isExpoPushToken(expoPushToken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Expo push token'
      });
    }

    // Update user's push token
    const user = await User.findByIdAndUpdate(
      userId,
      {
        expoPushToken,
        pushNotificationsEnabled: true
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        userId: user._id,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
        notificationSettings: user.notificationSettings
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

    const updateData = {};

    if (typeof pushNotificationsEnabled === 'boolean') {
      updateData.pushNotificationsEnabled = pushNotificationsEnabled;
    }

    if (notificationSettings) {
      updateData.notificationSettings = {
        ...notificationSettings
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: {
        userId: user._id,
        pushNotificationsEnabled: user.pushNotificationsEnabled,
        notificationSettings: user.notificationSettings
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