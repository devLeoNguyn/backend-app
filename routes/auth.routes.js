const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// === FLOW MỚI: 1 MÀN HÌNH DUY NHẤT ===
// Gửi OTP (tự động detect đăng ký hay đăng nhập)
router.post('/send-otp', authController.sendUnifiedOTP);

// Xác thực OTP (trả về needsRegistration để biết cần nhập thông tin hay không)
router.post('/verify-otp', authController.verifyUnifiedOTP);

// Hoàn tất đăng ký (chỉ khi needsRegistration = true)
router.post('/complete-registration', authController.completeRegistration);

// === ĐĂNG XUẤT ===
// Đăng xuất (không cần auth)
router.post('/logout', authController.logout);

module.exports = router;
