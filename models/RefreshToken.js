const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    device_info: {
        type: String,
        default: 'Unknown device'
    },
    is_revoked: {
        type: Boolean,
        default: false
    },
    expires_at: {
        type: Date,
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Index để tự động xóa token hết hạn
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema); 