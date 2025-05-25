const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Đăng ký thông thường
router.post('/register', authController.register);

// Đăng ký bằng OTP
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register-with-otp', authController.registerWithOTP);

module.exports = router;