const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['manual', 'auto'],
    required: true
  },
  event_type: {
    type: String,
    enum: ['new_movie', 'rental_expiry', 'new_episode', 'promotion', 'test'],
    default: null
  },
  target_type: {
    type: String,
    enum: ['all', 'segment', 'specific_users'],
    required: true
  },
  target_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  segment: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed'],
    default: 'draft'
  },
  scheduled_at: {
    type: Date,
    default: null
  },
  sent_at: {
    type: Date,
    default: null
  },
  sent_count: {
    type: Number,
    default: 0
  },
  failed_count: {
    type: Number,
    default: 0
  },
  total_target_count: {
    type: Number,
    default: 0
  },
  deep_link: {
    type: String,
    trim: true,
    default: null
  },
  image_url: {
    type: String,
    trim: true,
    default: null
  },
  priority: {
    type: String,
    enum: ['high', 'normal', 'low'],
    default: 'normal'
  },
  expires_at: {
    type: Date,
    default: null
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Create indexes for better performance
notificationSchema.index({ status: 1, scheduled_at: 1 });
notificationSchema.index({ type: 1, event_type: 1 });
notificationSchema.index({ created_at: -1 });

// Static method to find scheduled notifications due for sending
notificationSchema.statics.findScheduledNotifications = function() {
  const now = new Date();
  return this.find({
    status: 'scheduled',
    scheduled_at: { $lte: now }
  });
};

// Method to update notification statistics after sending
notificationSchema.methods.updateAfterSend = async function(successCount, failureCount) {
  this.sent_count += successCount;
  this.failed_count += failureCount;
  
  if (successCount + failureCount >= this.total_target_count) {
    this.status = 'sent';
    this.sent_at = new Date();
  }
  
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
