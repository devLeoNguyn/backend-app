const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// === ĐĂNG KÝ ===
// Đăng ký bằng OTP (không cần auth)
router.post('/register/send-otp', authController.sendRegisterOTP);
router.post('/register/verify-otp', authController.verifyRegisterOTP);
router.post('/register/complete', authController.registerWithOTP);

// === ĐĂNG NHẬP ===
// Đăng nhập bằng OTP (không cần auth)
router.post('/login/send-otp', authController.requestLoginOTP);
router.post('/login/verify', authController.loginWithOTP);

// === ĐĂNG XUẤT ===
// Đăng xuất (không cần auth)
router.post('/logout', authController.logout);

module.exports = router;
