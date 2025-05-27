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
  avatar: {
    type: String,
    default: null // URL của avatar
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Trạng thái xác thực cơ bản
  is_phone_verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
