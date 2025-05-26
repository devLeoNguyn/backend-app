const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.utils');

class TokenService {
    /**
     * Tạo mới refresh token và lưu vào database
     * @param {Object} user - User object
     * @param {String} deviceInfo - Thông tin thiết bị
     * @returns {Object} Access token và refresh token
     */
    static async createTokens(user, deviceInfo = 'Unknown device') {
        const access_token = generateAccessToken(user);
        const refresh_token = generateRefreshToken(user);

        // Tính thời gian hết hạn (7 ngày)
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + 7);

        // Lưu refresh token vào database
        await RefreshToken.create({
            token: refresh_token,
            user_id: user._id,
            device_info: deviceInfo,
            expires_at
        });

        return {
            access_token,
            refresh_token,
            expires_in: process.env.JWT_EXPIRES_IN,
            token_type: 'Bearer'
        };
    }

    /**
     * Kiểm tra refresh token có hợp lệ không
     * @param {String} token - Refresh token
     * @returns {Object} RefreshToken document
     */
    static async verifyRefreshToken(token) {
        const refreshToken = await RefreshToken.findOne({ 
            token,
            is_revoked: false
        });

        if (!refreshToken) {
            throw new Error('Refresh token không tồn tại hoặc đã bị thu hồi');
        }

        // Kiểm tra token đã hết hạn chưa
        if (refreshToken.expires_at < new Date()) {
            await RefreshToken.deleteOne({ _id: refreshToken._id });
            throw new Error('Refresh token đã hết hạn');
        }

        return refreshToken;
    }

    /**
     * Thu hồi refresh token
     * @param {String} token - Refresh token cần thu hồi
     */
    static async revokeToken(token) {
        const result = await RefreshToken.updateOne(
            { token },
            { is_revoked: true }
        );

        if (result.modifiedCount === 0) {
            throw new Error('Token không tồn tại');
        }
    }

    /**
     * Thu hồi tất cả refresh token của user
     * @param {String} userId - ID của user
     */
    static async revokeAllUserTokens(userId) {
        await RefreshToken.updateMany(
            { user_id: userId },
            { is_revoked: true }
        );
    }

    /**
     * Xóa các token đã hết hạn
     */
    static async cleanupExpiredTokens() {
        await RefreshToken.deleteMany({
            expires_at: { $lt: new Date() }
        });
    }
}

module.exports = TokenService; 