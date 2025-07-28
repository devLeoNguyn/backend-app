const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const User = require('../models/User');

// Debug endpoint to create test notifications
router.post('/create-test-notifications', async (req, res) => {
  try {
    console.log('🧪 [DEBUG] Creating test notifications...');
    
    // Find first user
    const users = await User.find({}).limit(3);
    console.log(`Found ${users.length} users`);
    
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found'
      });
    }

    // Delete old test notifications to avoid duplicates
    await Notification.deleteMany({ title: { $regex: /🧪|Test|Thử nghiệm/ } });
    await UserNotification.deleteMany({});
    console.log('🧹 Cleaned old test notifications');

    // Create test notifications
    const testNotifications = [
      {
        title: '🧪 Test Notification 1',
        body: 'Đây là thông báo test số 1 với nội dung đầy đủ',
        type: 'manual',
        target_type: 'all',
        priority: 'high',
        created_by: users[0]._id,
        status: 'sent',
        sent_at: new Date()
      },
      {
        title: '🎬 Phim mới: Spider-Man',
        body: 'Spider-Man: No Way Home đã có sẵn để xem. Đừng bỏ lỡ siêu phẩm này! Xem ngay để khám phá cuộc phiêu lưu đầy kịch tính.',
        type: 'auto',
        event_type: 'new_movie',
        target_type: 'all',
        priority: 'high',
        created_by: users[0]._id,
        status: 'sent',
        sent_at: new Date()
      },
      {
        title: '📺 Tập mới: Stranger Things',
        body: 'Stranger Things Season 4 - Tập 9 đã được thêm vào thư viện. Xem ngay để khám phá những bí ẩn mới!',
        type: 'auto',
        event_type: 'new_episode',
        target_type: 'all',
        priority: 'normal',
        created_by: users[0]._id,
        status: 'sent',
        sent_at: new Date()
      },
      {
        title: '🔥 Khuyến mãi Black Friday',
        body: 'Giảm 50% phí thuê phim trong tuần này. Sử dụng mã SALE50 để nhận ưu đãi. Có hiệu lực đến hết ngày 30/11.',
        type: 'manual',
        event_type: 'promotion',
        target_type: 'all',
        priority: 'normal',
        created_by: users[0]._id,
        status: 'sent',
        sent_at: new Date()
      },
      {
        title: '⏰ Sắp hết hạn thuê phim',
        body: 'Phim "Avengers: Endgame" của bạn sẽ hết hạn trong 2 ngày nữa. Hãy xem ngay để không bỏ lỡ!',
        type: 'auto',
        event_type: 'rental_expiry',
        target_type: 'all',
        priority: 'high',
        created_by: users[0]._id,
        status: 'sent',
        sent_at: new Date()
      }
    ];

    const createdNotifications = [];
    
    // Create notifications and user notifications
    for (const notifData of testNotifications) {
      const notification = await Notification.create(notifData);
      createdNotifications.push(notification);
      console.log(`✅ Created notification: ${notification.title}`);
      
      // Create user notifications for all users
      for (const user of users) {
        await UserNotification.create({
          user_id: user._id,
          notification_id: notification._id,
          is_read: Math.random() > 0.7, // 30% chance to be read
          created_at: new Date()
        });
      }
      console.log(`📤 Sent to ${users.length} users`);
    }

    console.log('🎊 All test notifications created successfully!');
    
    res.json({
      success: true,
      message: 'Test notifications created successfully',
      data: {
        notifications: createdNotifications.length,
        users: users.length,
        userIds: users.map(u => u._id)
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating test notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating test notifications',
      error: error.message
    });
  }
});

// Debug endpoint to check notifications for a user
router.get('/check-notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user notifications
    const userNotifications = await UserNotification.find({ user_id: userId })
      .populate('notification_id')
      .sort({ created_at: -1 })
      .limit(10);
    
    const result = userNotifications.map(un => ({
      _id: un._id,
      user_id: un.user_id,
      notification_id: un.notification_id._id,
      is_read: un.is_read,
      created_at: un.created_at,
      notification: {
        title: un.notification_id.title,
        body: un.notification_id.body,
        type: un.notification_id.type,
        event_type: un.notification_id.event_type
      }
    }));
    
    res.json({
      success: true,
      data: {
        count: result.length,
        notifications: result
      }
    });
    
  } catch (error) {
    console.error('Error checking notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking notifications',
      error: error.message
    });
  }
});

module.exports = router;
