const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // OTP hết hạn sau 5 phút
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    attempts: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('OTP', otpSchema); 