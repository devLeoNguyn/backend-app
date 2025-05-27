const User = require('../../models/User');
const TokenService = require('../../services/token.service');

// Refresh token
exports.refreshToken = async (req, res) => {
    try {
        const { refresh_token } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        if (!refresh_token) {
            return res.status(400).json({
                status: 'error',
                message: 'Refresh token là bắt buộc'
            });
        }

        // Verify và lấy thông tin refresh token từ database
        const refreshTokenDoc = await TokenService.verifyRefreshToken(refresh_token);
        
        // Thu hồi token cũ
        await TokenService.revokeToken(refresh_token);

        // Lấy thông tin user
        const user = await User.findById(refreshTokenDoc.user_id);
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User không tồn tại'
            });
        }

        // Tạo cặp token mới cho thiết bị hiện tại
        const tokens = await TokenService.createTokens(user, deviceInfo);

        res.json({
            status: 'success',
            message: 'Refresh token thành công',
            data: { 
                tokens,
                device_info: deviceInfo
            }
        });
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: error.message
        });
    }
};

// Đăng xuất khỏi thiết bị hiện tại
exports.logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (refresh_token) {
            // Thu hồi refresh token của thiết bị hiện tại
            await TokenService.revokeToken(refresh_token);
        }

        res.json({
            status: 'success',
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Đăng xuất khỏi tất cả thiết bị
exports.logoutAll = async (req, res) => {
    try {
        // Thu hồi tất cả refresh token của user
        await TokenService.revokeAllUserTokens(req.user._id);

        res.json({
            status: 'success',
            message: 'Đã đăng xuất khỏi tất cả thiết bị'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 