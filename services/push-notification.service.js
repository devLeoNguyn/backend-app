const { Expo } = require('expo-server-sdk');
const User = require('../models/User');

class PushNotificationService {
  constructor() {
    this.expo = new Expo();
  }

  async sendNotification(tokens, title, body, data = {}) {
    // Filter out invalid tokens
    const messages = tokens
      .filter(token => Expo.isExpoPushToken(token))
      .map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
      }));

    if (messages.length === 0) {
      console.log('No valid tokens to send notifications to');
      return [];
    }

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets = [];

    try {
      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          // Wait a second between chunks
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Error sending chunk:', error);
        }
      }

      return tickets;
    } catch (error) {
      console.error('Error in sendNotification:', error);
      throw error;
    }
  }

  async sendNewMovieNotification(movieId, movieTitle, moviePoster) {
    try {
      // Get all users with push notifications enabled and valid tokens
      const users = await User.find({
        pushNotificationsEnabled: true,
        expoPushToken: { $exists: true, $ne: null }
      });

      if (!users.length) {
        console.log('No users to notify');
        return;
      }

      const tokens = users.map(user => user.expoPushToken);

      const tickets = await this.sendNotification(
        tokens,
        '🎬 Phim mới đã ra mắt!',
        `${movieTitle} - Khám phá ngay!`,
        {
          type: 'NEW_MOVIE',
          movieId,
          movieTitle,
          moviePoster,
          action: 'VIEW_MOVIE'
        }
      );

      // Handle receipts
      await this.handleNotificationReceipts(tickets);

      return tickets;
    } catch (error) {
      console.error('Error in sendNewMovieNotification:', error);
      throw error;
    }
  }

  async handleNotificationReceipts(tickets) {
    const receiptIds = tickets.map(ticket => ticket.id);
    
    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
      
      for (const chunk of receiptIdChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          
          for (const [receiptId, receipt] of Object.entries(receipts)) {
            if (receipt.status === 'error') {
              const { details } = receipt;
              
              if (details?.error === 'DeviceNotRegistered') {
                await this.handleInvalidToken(details.expoPushToken);
              }
              
              console.error(
                `Error sending notification receipt[${receiptId}]:`,
                receipt.message,
                receipt.details
              );
            }
          }
        } catch (error) {
          console.error('Error checking receipts:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleNotificationReceipts:', error);
      throw error;
    }
  }

  async handleInvalidToken(token) {
    try {
      await User.updateMany(
        { expoPushToken: token },
        { 
          $set: { pushNotificationsEnabled: false },
          $unset: { expoPushToken: 1 }
        }
      );
      console.log(`Removed invalid token: ${token}`);
    } catch (error) {
      console.error('Error removing invalid token:', error);
    }
  }
}

module.exports = new PushNotificationService(); 