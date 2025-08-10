const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const fcmService = require('./fcm.service');

class PushNotificationService {
  /**
   * Send a push notification to a single user
   */
  async sendPushNotification(userToken, notification) {
    try {
      // Lấy user theo FCM token để kiểm tra trạng thái mute
      const user = await User.findOne({ fcmToken: userToken });
      
      if (user && user.notificationMute && user.notificationMute.isMuted) {
        if (!user.notificationMute.muteUntil || new Date() < user.notificationMute.muteUntil) {
          // Đang mute, không gửi notification
          return { success: false, error: 'User is muted' };
        }
      }

      // Gửi notification qua FCM
      if (user && user.fcmToken === userToken) {
        console.log('🔥 [PushNotificationService] Sending via FCM');
        return await fcmService.sendToToken(userToken, notification);
      }

      console.error(`Invalid FCM token: ${userToken}`);
      return { success: false, error: 'Invalid FCM token' };
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
      const fcmTokens = [];
      const processedTokens = new Set(); // Deduplicate push tokens
      let sentCount = 0;
      let failedCount = 0;

      // Create base notification data
      const baseNotificationData = {
        type: notification.event_type || notification.type,
        deep_link: notification.deep_link,
        notification_id: notification._id.toString()
      };
      
      // Convert web deep link to app deep link if needed
      if (baseNotificationData.deep_link && baseNotificationData.deep_link.startsWith('movie/')) {
        const movieId = baseNotificationData.deep_link.split('movie/')[1];
        baseNotificationData.deep_link = `datn2025v2://movie/${movieId}`;
      }
      
      // Add movie-specific data if available
      if (notification.deep_link && notification.deep_link.includes('movie/')) {
        const movieId = notification.deep_link.split('movie/')[1];
        baseNotificationData.movie_id = movieId;
        baseNotificationData.movie_title = notification.title.replace('🎬 Phim mới: ', '').replace('📺 ', '').split(' - ')[0];
        baseNotificationData.movie_poster = notification.image_url;
        
        // Add episode info if it's an episode notification
        if (notification.event_type === 'new_episode') {
          const episodeMatch = notification.title.match(/Tập (\d+)/);
          if (episodeMatch) {
            baseNotificationData.episode_number = parseInt(episodeMatch[1]);
          }
        }
      }

      // Get user tokens for all the target users
      for (const userNotification of userNotifications) {
        try {
          const user = await User.findById(userNotification.user_id);
          // Chỉ gửi push notification nếu user không bị mute và UserNotification được đánh dấu là đã gửi
          if (user && userNotification.is_sent) {
            // Chỉ sử dụng FCM token
            if (user.fcmToken && !processedTokens.has(user.fcmToken)) {
              processedTokens.add(user.fcmToken);
              fcmTokens.push(user.fcmToken);
              console.log('🔥 [PushNotificationService] Added FCM token for user:', user._id);
            }
          }
        } catch (error) {
          failedCount++;
          console.error(`Error preparing notification for user ${userNotification.user_id}:`, error);
        }
      }

      // Send FCM notifications
      if (fcmTokens.length > 0) {
        console.log(`🔥 [PushNotificationService] Sending ${fcmTokens.length} FCM notifications`);
        
        // Create proper notification object for FCM
        const fcmNotification = {
          title: notification.title,
          body: notification.body,
          data: baseNotificationData
        };
        
        const fcmResults = await fcmService.sendToTokens(fcmTokens, fcmNotification);
        
        // Handle FCM results
        if (fcmResults.summary) {
          // New format with summary
          sentCount = fcmResults.summary.success;
          failedCount = fcmResults.summary.failed;
        } else if (Array.isArray(fcmResults)) {
          // Array format
          for (const result of fcmResults) {
            if (result.success) {
              sentCount += result.sent || 0;
            } else {
              failedCount += result.tokens?.length || 0;
            }
          }
        } else {
          // Single result object
          if (fcmResults.success) {
            sentCount += fcmResults.sent || 0;
          } else {
            failedCount += fcmResults.tokens?.length || 0;
          }
        }
      }

      return {
        success: true,
        sentCount: sentCount,
        failedCount: failedCount,
        total: sentCount + failedCount
      };
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      return {
        success: false,
        error: error.message,
        sentCount: 0,
        failedCount: 0,
        total: 0
      };
    }
  }

  /**
   * Register FCM token for user
   */
  async registerFCMToken(userId, fcmToken) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Cập nhật FCM token và xóa Expo token cũ
      user.fcmToken = fcmToken;
      user.expoPushToken = null; // Xóa expo token cũ
      user.pushNotificationsEnabled = true;
      
      console.log('✅ [PushNotificationService] FCM token registered and expo token removed for user:', userId);
      
      await user.save();
      
      return user;
    } catch (error) {
      console.error('Error registering FCM token:', error);
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

  /**
   * Send new movie notification to all users
   */
  async sendNewMovieNotification(movieId, movieTitle, posterPath) {
    try {
      console.log('🎬 Sending new movie notification:', { movieId, movieTitle, posterPath });
      
      // Get all users with FCM tokens
      const users = await User.find({
        fcmToken: { $exists: true, $ne: null },
        pushNotificationsEnabled: true
      });
      
      if (users.length === 0) {
        console.log('⚠️ No users with FCM tokens found');
        return { success: false, message: 'No users with FCM tokens' };
      }
      
      console.log(`📱 Found ${users.length} users with FCM tokens`);
      
      // Create notification in database first
      const notificationService = require('./notification.service');
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        console.error('❌ No admin user found for creating notification');
        return { success: false, message: 'No admin user found' };
      }
      
      // Create notification record in database
      const notificationData = {
        title: '🎬 Phim mới: ' + movieTitle,
        body: 'Phim mới vừa được thêm vào hệ thống! Khám phá ngay!',
        type: 'auto',
        event_type: 'new_movie',
        target_type: 'all',
        deep_link: `movie/${movieId}`,
        image_url: posterPath,
        priority: 'high',
        created_by: adminUser._id
      };
      
      const notification = await notificationService.createNotification(notificationData);
      console.log('✅ Notification created in database:', notification._id);
      
      // Send push notifications and create UserNotification records
      const result = await notificationService.sendNotification(notification._id);
      
      console.log(`✅ New movie notification sent: ${result.sentCount} success, ${result.failedCount} failed`);
      
      return {
        success: true,
        notificationId: notification._id,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        total: result.sentCount + result.failedCount
      };
    } catch (error) {
      console.error('Error sending new movie notification:', error);
      throw error;
    }
  }

  /**
   * Send new episode notification to all users
   */
  async sendNewEpisodeNotification(movieId, movieTitle, episodeNumber, posterPath) {
    try {
      console.log('📺 Sending new episode notification:', { movieId, movieTitle, episodeNumber, posterPath });
      
      // Get all users with FCM tokens
      const users = await User.find({
        fcmToken: { $exists: true, $ne: null },
        pushNotificationsEnabled: true
      });
      
      if (users.length === 0) {
        console.log('⚠️ No users with FCM tokens found');
        return { success: false, message: 'No users with FCM tokens' };
      }
      
      console.log(`📱 Found ${users.length} users with FCM tokens`);
      
      // Create notification in database first
      const notificationService = require('./notification.service');
      const adminUser = await User.findOne({ role: 'admin' });
      
      if (!adminUser) {
        console.error('❌ No admin user found for creating notification');
        return { success: false, message: 'No admin user found' };
      }
      
      // Create notification record in database
      const notificationData = {
        title: `📺 ${movieTitle} - Tập ${episodeNumber}`,
        body: 'Tập phim mới vừa được cập nhật! Xem ngay!',
        type: 'auto',
        event_type: 'new_episode',
        target_type: 'all',
        deep_link: `movie/${movieId}`,
        image_url: posterPath,
        priority: 'high',
        created_by: adminUser._id
      };
      
      const notification = await notificationService.createNotification(notificationData);
      console.log('✅ Episode notification created in database:', notification._id);
      
      // Send push notifications and create UserNotification records
      const result = await notificationService.sendNotification(notification._id);
      
      console.log(`✅ New episode notification sent: ${result.sentCount} success, ${result.failedCount} failed`);
      
      return {
        success: true,
        notificationId: notification._id,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        total: result.sentCount + result.failedCount
      };
    } catch (error) {
      console.error('Error sending new episode notification:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService();