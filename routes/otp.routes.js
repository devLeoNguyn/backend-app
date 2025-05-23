const express = require('express');
const router = express.Router();
const { sendOtp } = require('../controllers/otp.controller');

router.post('/send', sendOtp);

module.exports = router;
