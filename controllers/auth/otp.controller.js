const User = require('../../models/User');
const OTPService = require('../../services/otp.service');
const TokenService = require('../../services/token.service');

// Gửi OTP đăng ký
exports.sendRegisterOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại là bắt buộc'
            });
        }

        // Validate số điện thoại
        const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại không hợp lệ'
            });
        }

        const result = await OTPService.createRegisterOTP(phone);

        res.status(200).json({
            status: 'success',
            message: 'Đã gửi mã OTP',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Xác thực OTP đăng ký
exports.verifyRegisterOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại và mã OTP là bắt buộc'
            });
        }

        await OTPService.verifyRegisterOTP(phone, otp);

        res.status(200).json({
            status: 'success',
            message: 'Xác thực OTP thành công'
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Xác thực OTP và tạo token
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        // Kiểm tra OTP
        const user = await OTPService.verifyLoginOTP(phone, otp);
        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
            });
        }

        // Cập nhật trạng thái xác thực phone
        user.is_phone_verified = true;
        await user.save();

        // Tạo token cho thiết bị mới
        const tokens = await TokenService.createTokens(user, deviceInfo);

        res.json({
            status: 'success',
            message: 'Xác thực thành công',
            data: {
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    is_phone_verified: user.is_phone_verified
                },
                tokens,
                device_info: deviceInfo
            }
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 