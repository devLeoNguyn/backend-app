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
            const notificationData = {
              type: notification.event_type || notification.type,
              deep_link: notification.deep_link,
              notification_id: notification._id.toString(),
              user_notification_id: userNotification._id.toString()
            };
            
            // Add movie-specific data if available
            if (notification.deep_link && notification.deep_link.includes('movie/')) {
              const movieId = notification.deep_link.split('movie/')[1];
              notificationData.movie_id = movieId;
              notificationData.movie_title = notification.title.replace('🎬 Phim mới: ', '').replace('📺 ', '').split(' - ')[0];
              notificationData.movie_poster = notification.image_url;
              
              // Add episode info if it's an episode notification
              if (notification.event_type === 'new_episode') {
                const episodeMatch = notification.title.match(/Tập (\d+)/);
                if (episodeMatch) {
                  notificationData.episode_number = parseInt(episodeMatch[1]);
                }
              }
            }
            
            messages.push({
              to: user.expoPushToken,
              sound: 'default',
              title: notification.title,
              body: notification.body,
              data: notificationData,
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

  /**
   * Send new movie notification to all users
   */
  async sendNewMovieNotification(movieId, movieTitle, posterPath) {
    try {
      console.log('🎬 Sending new movie notification:', { movieId, movieTitle, posterPath });
      
      // Get all users with push tokens
      const users = await User.find({
        expoPushToken: { $exists: true, $ne: null },
        pushNotificationsEnabled: true
      });
      
      if (users.length === 0) {
        console.log('⚠️ No users with push tokens found');
        return { success: false, message: 'No users with push tokens' };
      }
      
      console.log(`📱 Found ${users.length} users with push tokens`);
      
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
      
      // Get all users with push tokens
      const users = await User.find({
        expoPushToken: { $exists: true, $ne: null },
        pushNotificationsEnabled: true
      });
      
      if (users.length === 0) {
        console.log('⚠️ No users with push tokens found');
        return { success: false, message: 'No users with push tokens' };
      }
      
      console.log(`📱 Found ${users.length} users with push tokens`);
      
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