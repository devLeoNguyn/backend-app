const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Mock the services
jest.mock('../../services/notification.service', () => ({
  getUserNotifications: jest.fn(),
  getNotificationById: jest.fn(),
  markNotificationAsRead: jest.fn(),
  deleteUserNotification: jest.fn(),
  getUnreadCount: jest.fn()
}));

const notificationService = require('../../services/notification.service');
const notificationRoutes = require('../../routes/notification.routes');

// Configure the app
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/notifications', notificationRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    error: err
  });
});

describe('Notification API', () => {
  // Test data
  const mockUserId = '5f7d0e61b0d8a82d9c1f0d5a'; // Valid MongoDB ObjectId format
  const mockNotificationId = '5f7d0e61b0d8a82d9c1f0d5b';
  
  const mockNotification = {
    _id: mockNotificationId,
    title: 'Test Notification',
    body: 'This is a test notification',
    type: 'manual',
    target_type: 'all',
    status: 'sent',
    sent_at: new Date(),
    created_at: new Date()
  };
  
  const mockUserNotification = {
    notification_id: mockNotificationId,
    user_id: mockUserId,
    is_read: false,
    is_sent: true,
    sent_at: new Date()
  };

  // Reset mocks between tests
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Test GET /api/notifications
  describe('GET /api/notifications', () => {
    test('should get user notifications with valid userId', async () => {
      // Setup mock
      notificationService.getUserNotifications.mockResolvedValue({
        notifications: [mockNotification],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      
      // Make request
      const response = await request(app)
        .get('/api/notifications')
        .query({ userId: mockUserId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(notificationService.getUserNotifications).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });

    test('should return 400 if userId is missing', async () => {
      const response = await request(app).get('/api/notifications');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(notificationService.getUserNotifications).not.toHaveBeenCalled();
    });

    test('should handle service errors', async () => {
      // Setup mock to throw error
      notificationService.getUserNotifications.mockRejectedValue(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/notifications')
        .query({ userId: mockUserId });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error retrieving notifications');
    });
  });

  // Test GET /api/notifications/:id
  describe('GET /api/notifications/:id', () => {
    test('should get notification by id', async () => {
      // Setup mock
      notificationService.getNotificationById.mockResolvedValue(mockNotification);
      
      // Make request
      const response = await request(app)
        .get(`/api/notifications/${mockNotificationId}`)
        .query({ userId: mockUserId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification).toBeDefined();
      expect(notificationService.getNotificationById).toHaveBeenCalledWith(
        mockNotificationId,
        mockUserId
      );
    });

    test('should return 404 for non-existent notification', async () => {
      // Setup mock to return null
      notificationService.getNotificationById.mockResolvedValue(null);
      
      const response = await request(app)
        .get(`/api/notifications/${mockNotificationId}`)
        .query({ userId: mockUserId });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Test PUT /api/notifications/:id/read
  describe('PUT /api/notifications/:id/read', () => {
    test('should mark notification as read', async () => {
      // Setup mock
      notificationService.markNotificationAsRead.mockResolvedValue(true);
      
      // Make request
      const response = await request(app)
        .put(`/api/notifications/${mockNotificationId}/read`)
        .send({ userId: mockUserId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.markNotificationAsRead).toHaveBeenCalledWith(
        mockNotificationId,
        mockUserId
      );
    });

    test('should return 404 if notification not found', async () => {
      // Setup mock to return false
      notificationService.markNotificationAsRead.mockResolvedValue(false);
      
      const response = await request(app)
        .put(`/api/notifications/${mockNotificationId}/read`)
        .send({ userId: mockUserId });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Test DELETE /api/notifications/:id
  describe('DELETE /api/notifications/:id', () => {
    test('should delete user notification', async () => {
      // Setup mock
      notificationService.deleteUserNotification.mockResolvedValue(true);
      
      // Make request
      const response = await request(app)
        .delete(`/api/notifications/${mockNotificationId}`)
        .send({ userId: mockUserId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.deleteUserNotification).toHaveBeenCalledWith(
        mockNotificationId,
        mockUserId
      );
    });

    test('should return 404 if notification not found', async () => {
      // Setup mock to return false
      notificationService.deleteUserNotification.mockResolvedValue(false);
      
      const response = await request(app)
        .delete(`/api/notifications/${mockNotificationId}`)
        .send({ userId: mockUserId });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Test GET /api/notifications/unread-count
  describe('GET /api/notifications/unread-count', () => {
    test('should get unread count', async () => {
      // Setup mock
      notificationService.getUnreadCount.mockResolvedValue(5);
      
      // Make request
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .query({ userId: mockUserId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(5);
      expect(notificationService.getUnreadCount).toHaveBeenCalledWith(mockUserId);
    });

    test('should return 400 if userId is missing', async () => {
      const response = await request(app).get('/api/notifications/unread-count');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
