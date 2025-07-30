const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notification_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  is_sent: {
    type: Boolean,
    default: false
  },
  sent_at: {
    type: Date,
    default: null
  },
  delivery_status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'muted'],
    default: 'pending'
  },
  error_message: {
    type: String,
    default: null
  },
  device_token: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web', null],
    default: null
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create indexes for better performance
userNotificationSchema.index({ user_id: 1, is_read: 1 });
userNotificationSchema.index({ notification_id: 1 });
userNotificationSchema.index({ created_at: -1 });

// Method to mark notification as read
userNotificationSchema.methods.markAsRead = async function() {
  if (!this.is_read) {
    this.is_read = true;
    this.read_at = new Date();
    return this.save();
  }
  return this;
};

// Method to update delivery status
userNotificationSchema.methods.updateDeliveryStatus = async function(status, errorMessage = null) {
  this.delivery_status = status;
  
  if (status === 'sent' || status === 'delivered') {
    this.is_sent = true;
    this.sent_at = new Date();
  }
  
  if (status === 'failed' && errorMessage) {
    this.error_message = errorMessage;
  }
  
  return this.save();
};

// Static method to get unread count for a user
userNotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    user_id: userId,
    is_read: false
  });
};

module.exports = mongoose.model('UserNotification', userNotificationSchema);
