const { GoogleAuth } = require('google-auth-library');
const User = require('../models/User');

class FCMService {
  constructor() {
    this.auth = null;
    this.projectId = null;
    this.initialized = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize Google Auth with service account
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
        credentials: process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null
      });

      this.projectId = await this.auth.getProjectId();
      this.initialized = true;
      console.log('✅ [FCMService] Initialized with project ID:', this.projectId);
    } catch (error) {
      console.error('❌ [FCMService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Validate notification data
   */
  validateNotification(notification) {
    if (!notification) {
      throw new Error('Notification object is required');
    }
    if (!notification.title || !notification.body) {
      throw new Error('Notification title and body are required');
    }
    return true;
  }

  /**
   * Validate FCM token
   */
  validateFCMToken(token) {
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('Valid FCM token is required');
    }
    return true;
  }

  /**
   * Remove invalid FCM token from database
   */
  async removeInvalidFCMToken(token) {
    try {
      const result = await User.updateMany(
        { fcmToken: token },
        { $unset: { fcmToken: "" } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`🗑️ [FCMService] Removed invalid FCM token from ${result.modifiedCount} user(s):`, token.substring(0, 20) + '...');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ [FCMService] Failed to remove invalid FCM token:', error);
      return false;
    }
  }

  /**
   * Handle FCM error and remove invalid tokens
   */
  async handleFCMError(error, token) {
    const fcmErr = error?.response?.data?.error;
    
    if (fcmErr?.status === 'UNREGISTERED' || fcmErr?.status === 'INVALID_ARGUMENT') {
      console.log(`⚠️ [FCMService] Invalid FCM token detected (${fcmErr.status}):`, token.substring(0, 20) + '...');
      await this.removeInvalidFCMToken(token);
      return {
        success: false,
        error: `FCM token invalid (${fcmErr.status})`,
        tokenRemoved: true
      };
    }
    
    return {
      success: false,
      error: error.message,
      tokenRemoved: false
    };
  }

  /**
   * Retry mechanism for failed requests
   */
  async retryRequest(requestFn, maxRetries = this.maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const status = error?.response?.status;
        if (attempt === maxRetries) {
          throw error;
        }

        // Don't retry on client errors (4xx)
        if (status && status >= 400 && status < 500 && status !== 429) throw error;

        // 429: tôn trọng Retry-After, nếu không có → 60s
        if (status === 429) {
          const ra = Number(error?.response?.headers?.['retry-after']);
          const wait = Number.isFinite(ra) ? ra * 1000 : 60000;
          console.log(`⚠️ 429 rate-limited, waiting ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
        console.log(`⚠️ [${status || '???'}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Send FCM notification to a single token
   */
  async sendToToken(fcmToken, notification) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Validate inputs
      this.validateFCMToken(fcmToken);
      this.validateNotification(notification);

      const client = await this.auth.getClient();
      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

      const payload = {
        message: {
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: {
            type: notification.type || 'general',
            deep_link: notification.deep_link || '',
            notification_id: notification._id?.toString() || '',
            ...notification.data
          },
          android: {
            priority: 'HIGH',
            ttl: notification.ttl || '3600s',
            collapse_key: notification.collapseKey || 'movie_updates',
            notification: {
              channel_id: 'default',
              notification_priority: 'PRIORITY_HIGH',
              default_sound: true,
              default_vibrate_timings: true
            }
          }
        }
      };

      const response = await this.retryRequest(async () => {
        return await client.request({
          url,
          method: 'POST',
          data: payload
        });
      });

      console.log('✅ [FCMService] FCM notification sent successfully:', {
        token: fcmToken.substring(0, 20) + '...',
        messageId: response.data.name
      });

      return {
        success: true,
        messageId: response.data.name,
        data: response.data
      };
    } catch (error) {
      console.error('❌ [FCMService] Failed to send FCM notification:', error);
      
      // Handle FCM errors and remove invalid tokens
      const errorResult = await this.handleFCMError(error, fcmToken);
      
      return {
        ...errorResult,
        token: fcmToken.substring(0, 20) + '...'
      };
    }
  }

  /**
   * Send FCM notification to multiple tokens
   */
  async sendToTokens(fcmTokens, notification) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Validate inputs
      if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
        throw new Error('FCM tokens array is required and cannot be empty');
      }
      this.validateNotification(notification);

      // Validate all tokens
      fcmTokens.forEach(token => this.validateFCMToken(token));

      // HTTP v1 không còn /batch; gửi song song có giới hạn
      const client = await this.auth.getClient();
      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

      const makePayload = (token) => ({
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: {
            type: notification.type || 'general',
            deep_link: notification.deep_link || '',
            notification_id: notification._id?.toString() || '',
            ...notification.data
          },
          android: {
            priority: 'HIGH',
            ttl: notification.ttl || '3600s',
            collapse_key: notification.collapseKey || 'movie_updates',
            notification: {
              channel_id: 'default',
              notification_priority: 'PRIORITY_HIGH',
              default_sound: true,
              default_vibrate_timings: true
            }
          }
        }
      });

      // giới hạn concurrency để tránh 429/5xx
      const concurrency = 20;
      const groups = this.chunkArray(fcmTokens, concurrency);
      const results = [];
      let tokensRemoved = 0;

      for (const group of groups) {
        const settled = await Promise.allSettled(
          group.map(token =>
            this.retryRequest(async () => {
              return await client.request({
                url,
                method: 'POST',
                data: makePayload(token)
              });
            })
          )
        );

        for (let i = 0; i < settled.length; i++) {
          const result = settled[i];
          const token = group[i];
        
          if (result.status === 'fulfilled') {
            results.push({ token, success: true, messageId: result.value.data?.name });
          } else {
            const errorResult = await this.handleFCMError(result.reason, token);
            if (errorResult.tokenRemoved) tokensRemoved++;
            results.push({ token, success: false, error: errorResult.error, tokenRemoved: errorResult.tokenRemoved });
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      console.log(`📊 [FCMService] Batch send completed: ${successCount} success, ${failureCount} failed, ${tokensRemoved} invalid tokens removed`);

      return {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failureCount,
          tokensRemoved
        }
      };
    } catch (error) {
      console.error('❌ [FCMService] Failed to send batch FCM notifications:', error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Helper method to chunk array
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = new FCMService();

