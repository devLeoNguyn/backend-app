const User = require('../../models/User');
const OTPService = require('../../services/otp.service');

// Đăng nhập bằng OTP - Simple version (chỉ trả về userId)
exports.loginWithOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        if (!phone || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại và mã OTP là bắt buộc'
            });
        }

        // Xác thực OTP và lấy thông tin user
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

        // Chỉ trả về userId và thông tin user cơ bản
        res.json({
            status: 'success',
            message: 'Đăng nhập thành công',
            data: {
                userId: user._id,
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    is_phone_verified: user.is_phone_verified
                },

                device_info: deviceInfo
            }
        });
    } catch (error) {
        console.error('Login verify error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Lỗi khi xác thực đăng nhập'
        });
    }
};

// Đăng xuất - Simple version
exports.logout = async (req, res) => {
    try {
        res.json({
            status: 'success',
            message: 'Đăng xuất thành công'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi đăng xuất'
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