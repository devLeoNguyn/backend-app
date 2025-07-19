import React, { useState, useEffect, useCallback } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { notificationService, Notification as NotificationType, NotificationStats as StatsType } from '../services/notificationService';
import { authService } from '../services/authService';
import NotificationList from '../components/Notifications/NotificationList';
import NotificationForm from '../components/Notifications/NotificationForm';
import NotificationStats from '../components/Notifications/NotificationStats';
import NotificationFilters from '../components/Notifications/NotificationFilters';
import ScheduleModal from '../components/Notifications/ScheduleModal';
import toast from 'react-hot-toast';

const Notifications: React.FC = () => {
  // State for modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get notifications with hook
  const {
    notifications,
    loading,
    error,
    filters,
    pagination,
    selectedNotifications,
    updateFilters,
    changePage,
    createNotification,
    updateNotification,
    deleteNotification,
    sendNotification,
    scheduleNotification,
    bulkSendNotifications,
    bulkDeleteNotifications,
    deselectAll,
    setSelectedNotificationsList,
    fetchNotifications
  } = useNotifications();
  
  // Stats
  const [stats, setStats] = useState<StatsType | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Handle selection changes
  const handleSelectionChange = useCallback((selectedIds: string[]) => {
    // Update the selected notifications state with the new array
    setSelectedNotificationsList(selectedIds);
  }, [setSelectedNotificationsList]);
  
  // Current admin user
  const adminUser = authService.getCurrentUser();
  const adminUserId = adminUser?._id || '6863e129661212a5d79c271f'; // Fallback admin ID for testing
  
  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!adminUserId) return;
    
    try {
      setLoadingStats(true);
      const statsData = await notificationService.getNotificationStats(adminUserId);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching notification stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [adminUserId]);
  
  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  
  // Refresh stats after actions
  useEffect(() => {
    if (!loading) {
      fetchStats();
    }
  }, [notifications, loading, fetchStats]);
  
  // Handle create notification
  const handleCreateNotification = async (data: Partial<NotificationType>) => {
    setIsLoading(true);
    try {
      await createNotification({
        ...data,
        created_by: adminUserId
      });
      toast.success('Notification created successfully');
      setShowCreateModal(false);
      fetchNotifications(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create notification: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle update notification
  const handleUpdateNotification = async (data: Partial<NotificationType>) => {
    if (!selectedNotification) return;
    
    setIsLoading(true);
    try {
      await updateNotification(selectedNotification._id, data);
      toast.success('Notification updated successfully');
      setShowEditModal(false);
      setSelectedNotification(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update notification: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete notification
  const handleDeleteNotification = async (notificationId: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotification(notificationId);
        toast.success('Notification deleted successfully');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to delete notification: ${errorMessage}`);
      }
    }
  };
  
  // Handle send notification
  const handleSendNotification = async (notificationId: string) => {
    try {
      await sendNotification(notificationId);
      toast.success('Notification sent successfully');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to send notification: ${errorMessage}`);
    }
  };
  
  // Handle schedule notification
  const handleScheduleNotification = async (notificationId: string, scheduledAt: Date) => {
    try {
      await scheduleNotification(notificationId, scheduledAt);
      toast.success('Notification scheduled successfully');
      setShowScheduleModal(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to schedule notification: ${errorMessage}`);
    }
  };
  
  // Handle bulk send
  const handleBulkSend = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('No notifications selected');
      return;
    }
    
    if (window.confirm(`Are you sure you want to send ${selectedNotifications.length} notifications?`)) {
      try {
        const result = await bulkSendNotifications();
        toast.success(`Successfully sent ${result?.success_count || 0} notifications`);
        
        if (result?.failed_count) {
          toast.error(`Failed to send ${result.failed_count} notifications`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to send notifications: ${errorMessage}`);
      }
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('No notifications selected');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedNotifications.length} notifications?`)) {
      try {
        const result = await bulkDeleteNotifications();
        toast.success(`Successfully deleted ${result?.success_count || 0} notifications`);
        
        if (result?.failed_count) {
          toast.error(`Failed to delete ${result.failed_count} notifications`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Failed to delete notifications: ${errorMessage}`);
      }
    }
  };

  // Tab management
  const [activeTab, setActiveTab] = useState('all');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Update filters based on tab
    let statusFilters: string[] = [];
    
    switch (tab) {
      case 'draft':
        statusFilters = ['draft'];
        break;
      case 'scheduled':
        statusFilters = ['scheduled'];
        break;
      case 'sent':
        statusFilters = ['sent'];
        break;
      case 'failed':
        statusFilters = ['failed'];
        break;
      default:
        statusFilters = [];
    }
    
    updateFilters({ status: statusFilters.length > 0 ? statusFilters : undefined });
  };

  // Error handling
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="alert alert-error max-w-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
        <button onClick={fetchNotifications} className="btn btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📱 Push Notifications</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Notification
        </button>
      </div>

      {/* Stats Overview */}
      <div className="mb-6">
        <NotificationStats stats={stats} loading={loadingStats} />
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button 
          className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All
        </button>
        <button 
          className={`tab ${activeTab === 'draft' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('draft')}
        >
          Draft
        </button>
        <button 
          className={`tab ${activeTab === 'scheduled' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('scheduled')}
        >
          Scheduled
        </button>
        <button 
          className={`tab ${activeTab === 'sent' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('sent')}
        >
          Sent
        </button>
        <button 
          className={`tab ${activeTab === 'failed' ? 'tab-active' : ''}`}
          onClick={() => handleTabChange('failed')}
        >
          Failed
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <NotificationFilters 
          filters={filters} 
          onFilterChange={updateFilters}
        />
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="mb-4 p-2 bg-base-200 rounded-lg flex justify-between items-center">
          <span className="text-sm">
            {selectedNotifications.length} notification(s) selected
          </span>
          <div className="space-x-2">
            <button 
              className="btn btn-sm btn-primary"
              onClick={handleBulkSend}
            >
              Send Selected
            </button>
            <button 
              className="btn btn-sm btn-error"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </button>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={deselectAll}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notification List */}
      <div className="flex-grow">
        <NotificationList
          notifications={notifications}
          loading={loading}
          onEdit={(notification) => {
            setSelectedNotification(notification);
            setShowEditModal(true);
          }}
          onDelete={handleDeleteNotification}
          onSend={handleSendNotification}
          onSchedule={(notification) => {
            setSelectedNotification(notification);
            setShowScheduleModal(true);
          }}
          onSelectionChange={handleSelectionChange}
          selectedIds={selectedNotifications}
        />
      </div>

      {/* Create Notification Modal */}
      <NotificationForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateNotification}
        isLoading={isLoading}
        title="Create New Notification"
      />

      {/* Edit Notification Modal */}
      {selectedNotification && (
        <NotificationForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedNotification(null);
          }}
          onSubmit={handleUpdateNotification}
          notification={selectedNotification}
          isLoading={isLoading}
          title="Edit Notification"
        />
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedNotification(null);
        }}
        onSchedule={handleScheduleNotification}
        notification={selectedNotification}
        isLoading={isLoading}
      />

      {/* Pagination (simplified version) */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-4">
          <div className="join">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={`page-${page}`}
                className={`join-item btn btn-sm ${pagination.page === page ? 'btn-active' : ''}`}
                onClick={() => changePage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
