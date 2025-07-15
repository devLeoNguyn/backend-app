const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    default: null
  },
  avatar: {
    type: String,
    default: null // URL của avatar (fallback placeholder luôn hoạt động)
  },
  password: {
    type: String,
    default: null // Optional for OTP users, required for ADMIN
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  is_phone_verified: {
    type: Boolean,
    default: false
  },
  // Thêm các trường cho push notification
  pushNotificationsEnabled: {
    type: Boolean,
    default: true
  },
  expoPushToken: {
    type: String,
    sparse: true // Cho phép null và unique khi có giá trị
  },
  notificationSettings: {
    newMovies: {
      type: Boolean,
      default: true
    },
    newEpisodes: {
      type: Boolean,
      default: true
    },
    favoriteGenres: [{
      type: String
    }],
    quietHours: {
      start: {
        type: String,
        default: "22:00"
      },
      end: {
        type: String,
        default: "08:00"
      },
      enabled: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

userSchema.pre('save', function(next) {
  if (!this.full_name || this.full_name.trim() === '') {
    if (this.email) {
      this.full_name = this.email.split('@')[0];
    } else {
      this.full_name = 'User';
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
