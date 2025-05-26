const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const { authenticateToken } = require('../middleware/auth.middleware');

// Lấy thông tin user hiện tại (Profile)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User không tồn tại'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Lấy thông tin user thành công',
      data: { user }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi lấy thông tin user'
    });
  }
});

// Cập nhật thông tin user
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { full_name, email } = req.body;
    
    // Kiểm tra email đã tồn tại (nếu thay đổi)
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email đã được sử dụng'
        });
      }
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { full_name, email },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      status: 'success',
      message: 'Cập nhật thông tin thành công',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi khi cập nhật thông tin'
    });
  }
});

module.exports = router;
