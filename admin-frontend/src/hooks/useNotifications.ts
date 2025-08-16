import { useState, useEffect, useCallback } from 'react';
import { 
  notificationService, 
  Notification
} from '../services/notificationService';
import { authService } from '../services/authService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  // Get the current admin user
  const adminUser = authService.getCurrentUser();
  const adminUserId = adminUser?._id || '6863e129661212a5d79c271f'; // Fallback admin ID for testing
  
  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!adminUserId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching notifications with:', { adminUserId });
      
      const response = await notificationService.getNotifications(adminUserId, {});
      
      console.log('Notifications response:', response);
      
      setNotifications(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching notifications';
      console.error('Error fetching notifications:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [adminUserId]);
  
  // Fetch notifications when component mounts or filters change
  useEffect(() => {
    console.log('useNotifications useEffect triggered with adminUserId:', adminUserId);
    if (adminUserId) {
      fetchNotifications();
    }
  }, [adminUserId, fetchNotifications]);
  
  // Change page
  const changePage = useCallback((_page: number) => {
    // Simple pagination without filters
    fetchNotifications();
  }, [fetchNotifications]);
  
  // Create a notification
  const createNotification = useCallback(async (notificationData: Partial<Notification>) => {
    if (!adminUserId) return null;
    
    try {
      const newNotification = await notificationService.createNotification(
        adminUserId, 
        notificationData
      );
      
      // Refresh the list
      fetchNotifications();
      
      return newNotification;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error creating notification';
      setError(errorMessage);
      return null;
    }
  }, [adminUserId, fetchNotifications]);
  
  // Update a notification
  const updateNotification = useCallback(async (notificationId: string, notificationData: Partial<Notification>) => {
    if (!adminUserId) return null;
    
    try {
      const updatedNotification = await notificationService.updateNotification(
        adminUserId, 
        notificationId, 
        notificationData
      );
      
      // Update in the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId ? updatedNotification : notification
        )
      );
      
      return updatedNotification;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error updating notification';
      setError(errorMessage);
      return null;
    }
  }, [adminUserId]);
  
  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!adminUserId) return false;
    
    try {
      await notificationService.deleteNotification(adminUserId, notificationId);
      
      // Remove from the local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification._id !== notificationId)
      );
      
      // Remove from selected if present
      setSelectedNotifications(prevSelected => 
        prevSelected.filter(id => id !== notificationId)
      );
      
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting notification';
      setError(errorMessage);
      return false;
    }
  }, [adminUserId]);
  
  // Send a notification immediately
  const sendNotification = useCallback(async (notificationId: string) => {
    if (!adminUserId) return false;
    
    try {
      await notificationService.sendNotification(adminUserId, notificationId);
      
      // Update status in the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, status: 'sent', sent_at: new Date() }
            : notification
        )
      );
      
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending notification';
      setError(errorMessage);
      return false;
    }
  }, [adminUserId]);
  
  // Schedule a notification for later
  const scheduleNotification = useCallback(async (notificationId: string, scheduledAt: Date) => {
    if (!adminUserId) return false;
    
    try {
      await notificationService.scheduleNotification(adminUserId, notificationId, scheduledAt);
      
      // Update status in the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, status: 'scheduled', scheduled_at: scheduledAt }
            : notification
        )
      );
      
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error scheduling notification';
      setError(errorMessage);
      return false;
    }
  }, [adminUserId]);
  
  // Bulk actions
  const bulkSendNotifications = useCallback(async (notificationIds: string[] = selectedNotifications) => {
    if (!adminUserId || notificationIds.length === 0) return null;
    
    try {
      const result = await notificationService.bulkSendNotifications(adminUserId, notificationIds);
      
      // Refresh the list
      fetchNotifications();
      
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error sending notifications in bulk';
      setError(errorMessage);
      return null;
    }
  }, [adminUserId, fetchNotifications, selectedNotifications]);
  
  const bulkDeleteNotifications = useCallback(async (notificationIds: string[] = selectedNotifications) => {
    if (!adminUserId || notificationIds.length === 0) return null;
    
    try {
      const result = await notificationService.bulkDeleteNotifications(adminUserId, notificationIds);
      
      // Refresh the list
      fetchNotifications();
      
      // Clear selection
      setSelectedNotifications([]);
      
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting notifications in bulk';
      setError(errorMessage);
      return null;
    }
  }, [adminUserId, fetchNotifications, selectedNotifications]);
  
  // Selection handling
  const toggleSelection = useCallback((notificationId: string) => {
    setSelectedNotifications(prevSelected => {
      if (prevSelected.includes(notificationId)) {
        return prevSelected.filter(id => id !== notificationId);
      } else {
        return [...prevSelected, notificationId];
      }
    });
  }, []);
  
  const selectAll = useCallback(() => {
    setSelectedNotifications(notifications.map(n => n._id));
  }, [notifications]);
  
  const deselectAll = useCallback(() => {
    setSelectedNotifications([]);
  }, []);
  
  // Set selected notifications directly
  const setSelectedNotificationsList = useCallback((notifications: string[]) => {
    setSelectedNotifications(notifications);
  }, []);
  
  // Initial data fetching
  useEffect(() => {
    if (adminUserId) {
      fetchNotifications();
    }
  }, [adminUserId, fetchNotifications]);
  
  return {
    notifications,
    loading,
    error,
    pagination,
    selectedNotifications,
    changePage,
    createNotification,
    updateNotification,
    deleteNotification,
    sendNotification,
    scheduleNotification,
    bulkSendNotifications,
    bulkDeleteNotifications,
    toggleSelection,
    selectAll,
    deselectAll,
    setSelectedNotificationsList,
    fetchNotifications
  };
};
