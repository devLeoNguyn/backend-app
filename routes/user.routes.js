const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
    getProfile,
    updateProfile
} = require('../controllers/user.controller');

// Tất cả routes yêu cầu đăng nhập
router.use(authenticateToken);

// Lấy thông tin profile
router.get('/profile', getProfile);

// Cập nhật profile
router.put('/profile', updateProfile);

module.exports = router;
