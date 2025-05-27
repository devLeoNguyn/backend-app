const User = require('../../models/User');
const OTPService = require('../../services/otp.service');

// Đăng nhập bằng OTP
exports.loginWithOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        // Kiểm tra user tồn tại
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Số điện thoại chưa được đăng ký'
            });
        }

        // Gửi OTP
        const result = await OTPService.createLoginOTP(phone);

        res.json({
            status: 'success',
            message: 'Mã OTP đã được gửi đến số điện thoại của bạn',
            data: {
                device_info: deviceInfo
            }
        });
    } catch (error) {
        console.error('Login OTP error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi gửi OTP'
        });
    }
};

// Yêu cầu OTP để đăng nhập
exports.requestLoginOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại là bắt buộc'
            });
        }

        // Kiểm tra user có tồn tại không
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Số điện thoại chưa được đăng ký'
            });
        }

        // Gửi OTP đăng nhập
        const result = await OTPService.createLoginOTP(phone);

        res.status(200).json({
            status: 'success',
            message: 'Đã gửi mã OTP đăng nhập',
            data: result
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
}; 