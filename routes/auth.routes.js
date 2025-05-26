const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// === ĐĂNG KÝ ===
// Đăng ký bằng OTP (không cần auth)
router.post('/register/send-otp', authController.sendRegisterOTP);
router.post('/register/verify-otp', authController.verifyRegisterOTP);
router.post('/register/complete', authController.registerWithOTP);

// === ĐĂNG NHẬP ===
// Đăng nhập bằng OTP (không cần auth)
router.post('/login/send-otp', authController.requestLoginOTP);
router.post('/login/verify', authController.loginWithOTP);

// === TOKEN MANAGEMENT ===
// Refresh access token (không cần auth - chỉ cần refresh token hợp lệ)
router.post('/refresh-token', authController.refreshToken);

// === ĐĂNG XUẤT ===
// Đăng xuất thiết bị hiện tại (cần auth)
router.post('/logout', authenticateToken, authController.logout);

// Đăng xuất tất cả thiết bị (cần auth)
router.post('/logout-all', authenticateToken, authController.logoutAll);

module.exports = router;
