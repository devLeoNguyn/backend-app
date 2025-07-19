const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Mock the services
jest.mock('../../services/notification.service', () => ({
  createNotification: jest.fn(),
  getNotifications: jest.fn(),
  getNotificationById: jest.fn(),
  updateNotification: jest.fn(),
  deleteNotification: jest.fn(),
  sendNotification: jest.fn(),
  scheduleNotification: jest.fn(),
  bulkSendNotifications: jest.fn(),
  bulkDeleteNotifications: jest.fn(),
  getNotificationStats: jest.fn()
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

const notificationService = require('../../services/notification.service');
const User = require('../../models/User');
const adminNotificationRoutes = require('../../routes/admin.routes');

// Configure the app
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/admin', adminNotificationRoutes);

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message,
    error: err
  });
});

describe('Admin Notification API', () => {
  // Test data
  const mockAdminId = '5f7d0e61b0d8a82d9c1f0d5a'; // Valid MongoDB ObjectId format
  const mockNotificationId = '5f7d0e61b0d8a82d9c1f0d5b';
  
  const mockAdmin = {
    _id: mockAdminId,
    full_name: 'Admin User',
    email: 'admin@test.com',
    phone: '0123456789',
    role: 'admin'
  };
  
  const mockNotification = {
    _id: mockNotificationId,
    title: 'Test Admin Notification',
    body: 'This is a test admin notification',
    type: 'manual',
    target_type: 'all',
    status: 'draft',
    created_by: mockAdminId,
    created_at: new Date()
  };

  // Mock admin user before each test
  beforeEach(() => {
    jest.resetAllMocks();
    User.findById.mockResolvedValue(mockAdmin);
  });

  // Test POST /api/admin/notifications
  describe('POST /api/admin/notifications', () => {
    test('should create notification with valid admin user', async () => {
      // Setup mock
      notificationService.createNotification.mockResolvedValue(mockNotification);
      
      // Request payload
      const payload = {
        userId: mockAdminId,
        title: 'Test Admin Notification',
        body: 'This is a test admin notification',
        type: 'manual',
        target_type: 'all',
        created_by: mockAdminId
      };
      
      // Make request - send userId in body
      const response = await request(app)
        .post('/api/admin/notifications')
        .send(payload);
      
      // Assertions
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification).toBeDefined();
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: payload.title,
          body: payload.body,
          type: payload.type,
          target_type: payload.target_type,
          created_by: mockAdminId
        })
      );
    });

    test('should return 400 if created_by is missing', async () => {
      const response = await request(app)
        .post('/api/admin/notifications')
        .send({
          title: 'Test Notification',
          body: 'This is a test notification',
          type: 'manual',
          target_type: 'all'
          // Missing created_by
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    test('should return 403 if user is not admin', async () => {
      // Mock findById to return a non-admin user
      User.findById.mockResolvedValue({
        _id: mockAdminId,
        full_name: 'Regular User',
        email: 'user@test.com',
        phone: '0123456780',
        role: 'user'
      });
      
      const response = await request(app)
        .post('/api/admin/notifications')
        .send({
          userId: mockAdminId,
          title: 'Test Notification',
          body: 'This is a test notification',
          type: 'manual',
          target_type: 'all',
          created_by: mockAdminId
        });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });
  });

  // Test GET /api/admin/notifications
  describe('GET /api/admin/notifications', () => {
    test('should get notifications list with filters', async () => {
      // Setup mock
      notificationService.getNotifications.mockResolvedValue({
        notifications: [mockNotification],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
      
      // Make request with filters
      const response = await request(app)
        .get('/api/admin/notifications')
        .query({
          userId: mockAdminId,
          status: 'draft',
          type: 'manual',
          page: 1,
          limit: 10
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(notificationService.getNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft', type: 'manual' }),
        expect.objectContaining({ page: 1, limit: 10 })
      );
    });
  });

  // Test GET /api/admin/notifications/:id
  describe('GET /api/admin/notifications/:id', () => {
    test('should get notification details', async () => {
      // Setup mock
      notificationService.getNotificationById.mockResolvedValue(mockNotification);
      
      // Make request
      const response = await request(app)
        .get(`/api/admin/notifications/${mockNotificationId}`)
        .query({ userId: mockAdminId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification).toBeDefined();
      expect(notificationService.getNotificationById).toHaveBeenCalledWith(mockNotificationId);
    });

    test('should return 404 if notification not found', async () => {
      // Setup mock
      notificationService.getNotificationById.mockResolvedValue(null);
      
      const response = await request(app)
        .get(`/api/admin/notifications/${mockNotificationId}`)
        .query({ userId: mockAdminId });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Test PUT /api/admin/notifications/:id
  describe('PUT /api/admin/notifications/:id', () => {
    test('should update notification', async () => {
      // Setup mock
      notificationService.updateNotification.mockResolvedValue({
        ...mockNotification,
        title: 'Updated Title'
      });
      
      // Make request
      const response = await request(app)
        .put(`/api/admin/notifications/${mockNotificationId}`)
        .send({
          userId: mockAdminId,
          title: 'Updated Title'
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.title).toBe('Updated Title');
      expect(notificationService.updateNotification).toHaveBeenCalledWith(
        mockNotificationId,
        expect.objectContaining({ title: 'Updated Title' })
      );
    });

    test('should return 404 if notification not found', async () => {
      // Setup mock
      notificationService.updateNotification.mockResolvedValue(null);
      
      const response = await request(app)
        .put(`/api/admin/notifications/${mockNotificationId}`)
        .send({ 
          userId: mockAdminId,
          title: 'Updated Title' 
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // Test POST /api/admin/notifications/:id/send
  describe('POST /api/admin/notifications/:id/send', () => {
    test('should send notification immediately', async () => {
      // Setup mock
      notificationService.sendNotification.mockResolvedValue({
        success: true,
        sentCount: 10,
        failedCount: 0
      });
      
      // Make request
      const response = await request(app)
        .post(`/api/admin/notifications/${mockNotificationId}/send`)
        .send({ userId: mockAdminId });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(mockNotificationId);
    });
  });

  // Test POST /api/admin/notifications/:id/schedule
  describe('POST /api/admin/notifications/:id/schedule', () => {
    test('should schedule notification for later', async () => {
      // Setup mock
      const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day later
      notificationService.scheduleNotification.mockResolvedValue({
        ...mockNotification,
        scheduled_at: scheduledAt,
        status: 'scheduled'
      });
      
      // Make request
      const response = await request(app)
        .post(`/api/admin/notifications/${mockNotificationId}/schedule`)
        .send({
          userId: mockAdminId,
          scheduled_at: scheduledAt.toISOString()
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notification.status).toBe('scheduled');
      expect(notificationService.scheduleNotification).toHaveBeenCalledWith(
        mockNotificationId,
        expect.any(Date)
      );
    });

    test('should validate scheduled_at is in the future', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const response = await request(app)
        .post(`/api/admin/notifications/${mockNotificationId}/schedule`)
        .send({
          userId: mockAdminId,
          scheduled_at: pastDate.toISOString()
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
