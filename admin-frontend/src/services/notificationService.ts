import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Types
export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: 'manual' | 'auto';
  event_type?: string;
  target_type: 'all' | 'segment' | 'specific_users';
  target_users?: string[];
  segment?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduled_at?: Date;
  sent_at?: Date;
  sent_count: number;
  failed_count: number;
  total_target_count: number;
  muted_count?: number;
  deep_link?: string;
  image_url?: string;
  priority?: 'high' | 'normal' | 'low';
  expires_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  scheduled: number;
  draft: number;
  failed: number;
  delivery_success_rate: number;
  read_rate: number;
  top_notifications: Array<{
    _id: string;
    title: string;
    sent_count: number;
    read_count: number;
  }>;
  notification_by_type: {
    [key: string]: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}



class NotificationService {
  // Get all notifications
  async getNotifications(
    adminUserId: string,
    // ❌ KHÔNG SỬ DỤNG - _filters parameter không được sử dụng trong function
    // 🗓️ Date: 24/08/2025 - Comment vì ESLint warning "'_filters' is assigned a value but never used"
    // _filters: any = {}
  ): Promise<PaginatedResponse<Notification>> {
    try {
      // Simple params
      const params = new URLSearchParams();
      params.append('userId', adminUserId);
      
      const url = `${API_ENDPOINTS.ADMIN_NOTIFICATIONS}?${params.toString()}`;
      console.log('Fetching notifications from:', url);
      
      const response = await axios.get(url);
      
      console.log('API Response:', response.data);
      
      // Backend returns: { success: true, data: { notifications: [...], pagination: {...} } }
      // We need to return: { data: [...], total: number, page: number, limit: number, totalPages: number }
      const responseData = response.data.data;
      
      return {
        data: responseData.notifications,
        total: responseData.pagination.total,
        page: responseData.pagination.page,
        limit: responseData.pagination.limit,
        totalPages: responseData.pagination.totalPages
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get a single notification by ID
  async getNotificationById(adminUserId: string, notificationId: string): Promise<Notification> {
    try {
      const response = await axios.get(`${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/${notificationId}?userId=${adminUserId}`);
      return response.data.data.notification;
    } catch (error) {
      console.error(`Error fetching notification ${notificationId}:`, error);
      throw error;
    }
  }

  // Create a new notification
  async createNotification(adminUserId: string, notificationData: Partial<Notification>): Promise<Notification> {
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_NOTIFICATIONS, {
        ...notificationData,
        userId: adminUserId,
        created_by: adminUserId  // Add created_by field
      });
      return response.data.data.notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Update an existing notification
  async updateNotification(adminUserId: string, notificationId: string, notificationData: Partial<Notification>): Promise<Notification> {
    try {
      const response = await axios.put(`${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/${notificationId}`, {
        ...notificationData,
        userId: adminUserId
      });
      return response.data.data.notification;
    } catch (error) {
      console.error(`Error updating notification ${notificationId}:`, error);
      throw error;
    }
  }

  // Delete a notification
  async deleteNotification(adminUserId: string, notificationId: string): Promise<void> {
    try {
      await axios.delete(`${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/${notificationId}`, {
        data: { userId: adminUserId }
      });
    } catch (error) {
      console.error(`Error deleting notification ${notificationId}:`, error);
      throw error;
    }
  }

  // Send a notification immediately
  async sendNotification(adminUserId: string, notificationId: string): Promise<void> {
    try {
      await axios.post(`${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/${notificationId}/send`, {
        userId: adminUserId
      });
    } catch (error) {
      console.error(`Error sending notification ${notificationId}:`, error);
      throw error;
    }
  }

  // Schedule a notification for later
  async scheduleNotification(adminUserId: string, notificationId: string, scheduledAt: Date): Promise<void> {
    try {
      await axios.post(`${API_ENDPOINTS.ADMIN_NOTIFICATIONS}/${notificationId}/schedule`, {
        userId: adminUserId,
        scheduled_at: scheduledAt.toISOString()
      });
    } catch (error) {
      console.error(`Error scheduling notification ${notificationId}:`, error);
      throw error;
    }
  }

  // Bulk send notifications
  async bulkSendNotifications(adminUserId: string, notificationIds: string[]): Promise<{ success_count: number; failed_count: number }> {
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_NOTIFICATION_BULK_SEND, {
        userId: adminUserId,
        notification_ids: notificationIds
      });
      return response.data.data;
    } catch (error) {
      console.error('Error bulk sending notifications:', error);
      throw error;
    }
  }

  // Bulk delete notifications
  async bulkDeleteNotifications(adminUserId: string, notificationIds: string[]): Promise<{ success_count: number; failed_count: number }> {
    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_NOTIFICATION_BULK_DELETE, {
        userId: adminUserId,
        notification_ids: notificationIds
      });
      return response.data.data;
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(adminUserId: string): Promise<NotificationStats> {
    try {
      const response = await axios.get(`${API_ENDPOINTS.ADMIN_NOTIFICATION_STATS}?userId=${adminUserId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
