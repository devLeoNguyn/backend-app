const User = require('../../models/User');
const OTPService = require('../../services/otp.service');
const TokenService = require('../../services/token.service');

// Bước 1: Kiểm tra thông tin và gửi OTP
exports.register = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng nhập số điện thoại'
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

        // Kiểm tra phone đã tồn tại
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại đã được sử dụng'
            });
        }

        // Gửi OTP để xác thực số điện thoại
        const result = await OTPService.createRegisterOTP(phone);

        res.status(200).json({
            status: 'success',
            message: 'Vui lòng xác thực số điện thoại của bạn',
            data: {
                phone
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi đăng ký tài khoản'
        });
    }
};

// Bước 2: Xác thực OTP và nhập thông tin cá nhân
exports.registerWithOTP = async (req, res) => {
    try {
        const { full_name, email, gender } = req.body;

        // Validate dữ liệu cơ bản
        if (!full_name || !email || !gender) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng điền đầy đủ họ tên, email và giới tính'
            });
        }

        // Validate gender
        const validGenders = ['male', 'female'];
        if (!validGenders.includes(gender)) {
            return res.status(400).json({
                status: 'error',
                message: 'Giới tính không hợp lệ'
            });
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Email không hợp lệ'
            });
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                status: 'error',
                message: 'Email đã được sử dụng'
            });
        }

        // Tìm số điện thoại đã xác thực gần nhất
        const verifiedOTP = await OTPService.findLatestVerifiedOTP();
        if (!verifiedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng xác thực số điện thoại trước'
            });
        }

        // Tạo user mới với số điện thoại đã xác thực
        const user = await User.create({
            full_name,
            email,
            gender,
            phone: verifiedOTP.phone,
            is_phone_verified: true
        });

        // Đánh dấu OTP đã sử dụng
        verifiedOTP.isUsed = true;
        await verifiedOTP.save();

        // Tạo tokens
        const tokens = await TokenService.createTokens(user);

        res.status(201).json({
            status: 'success',
            message: 'Đăng ký thành công',
            data: {
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    gender: user.gender,
                    is_phone_verified: user.is_phone_verified
                },
                tokens
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
}; 