const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');

// Initialize Expo SDK
const expo = new Expo();

class PushNotificationService {
  /**
   * Send a push notification to a single user
   */
  async sendPushNotification(userToken, notification) {
    try {
      // Lấy user theo token để kiểm tra trạng thái mute
      const user = await User.findOne({ expoPushToken: userToken });
      if (user && user.notificationMute && user.notificationMute.isMuted) {
        if (!user.notificationMute.muteUntil || new Date() < user.notificationMute.muteUntil) {
          // Đang mute, không gửi notification
          return { success: false, error: 'User is muted' };
        }
      }
      if (!Expo.isExpoPushToken(userToken)) {
        console.error(`Invalid Expo push token: ${userToken}`);
        return { success: false, error: 'Invalid push token' };
      }

      const message = {
        to: userToken,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: {
          type: notification.type,
          deep_link: notification.deep_link,
          notification_id: notification._id.toString()
        }
      };

      const chunks = expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      return { success: true, tickets };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send bulk push notifications
   * This function was missing and causing test failures
   */
  async sendBulkPushNotifications(notification, userNotifications) {
    try {
      const messages = [];
      const processedTokens = new Set(); // Deduplicate push tokens
      let sentCount = 0;
      let failedCount = 0;

      // Get user tokens for all the target users
      for (const userNotification of userNotifications) {
        try {
          const user = await User.findById(userNotification.user_id);
          // Chặn gửi nếu user đang mute
          if (user && user.notificationMute && user.notificationMute.isMuted) {
            if (!user.notificationMute.muteUntil || new Date() < user.notificationMute.muteUntil) {
              // Đang mute, bỏ qua gửi notification cho user này
              continue;
            }
          }
          
          if (user && user.expoPushToken && !processedTokens.has(user.expoPushToken)) {
            // Add token to processed set to avoid duplicates
            processedTokens.add(user.expoPushToken);
            
            // Create notification message
            messages.push({
              to: user.expoPushToken,
              sound: 'default',
              title: notification.title,
              body: notification.body,
              data: {
                type: notification.type,
                deep_link: notification.deep_link,
                notification_id: notification._id.toString(),
                user_notification_id: userNotification._id.toString()
              },
              priority: notification.priority || 'default'
            });
          }
        } catch (error) {
          failedCount++;
          console.error(`Error preparing notification for user ${userNotification.user_id}:`, error);
        }
      }

      // Send notifications in chunks
      if (messages.length > 0) {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            failedCount += chunk.length;
            console.error('Error sending push notification chunk:', error);
          }
        }

        // Process tickets
        for (const ticket of tickets) {
          if (ticket.status === 'ok') {
            sentCount++;
          } else {
            failedCount++;
          }
        }
      }

      return {
        success: sentCount,
        failure: failedCount,
        total: userNotifications.length
      };
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  /**
   * Register push token for user
   */
  async registerPushToken(userId, token) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      user.expoPushToken = token;
      user.pushNotificationsEnabled = true;
      
      await user.save();
      
      return user;
    } catch (error) {
      console.error('Error registering push token:', error);
      throw error;
    }
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(userId, settings) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Update push notifications enabled state
      if (settings.enabled !== undefined) {
        user.pushNotificationsEnabled = settings.enabled;
      }
      
      // Initialize notification settings if not exist
      if (!user.notificationSettings) {
        user.notificationSettings = {};
      }
      
      // Update specific settings
      if (settings.newMovies !== undefined) {
        user.notificationSettings.newMovies = settings.newMovies;
      }
      
      if (settings.newEpisodes !== undefined) {
        user.notificationSettings.newEpisodes = settings.newEpisodes;
      }
      
      if (settings.favoriteGenres) {
        user.notificationSettings.favoriteGenres = settings.favoriteGenres;
      }
      
      if (settings.quietHours) {
        user.notificationSettings.quietHours = settings.quietHours;
      }
      
      await user.save();
      
      return user;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();