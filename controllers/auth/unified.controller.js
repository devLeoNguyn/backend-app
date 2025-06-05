const User = require('../../models/User');
const OTPService = require('../../services/otp.service');
const OTP = require('../../models/OTP');

/**
 * FLOW MỚI: Gửi OTP thống nhất (đăng ký + đăng nhập)
 * - Nếu SĐT đã tồn tại → Gửi OTP đăng nhập
 * - Nếu SĐT chưa tồn tại → Gửi OTP đăng ký
 */
exports.sendUnifiedOTP = async (req, res) => {
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

        // Kiểm tra user đã tồn tại chưa
        const existingUser = await User.findOne({ phone });
        const isExistingUser = !!existingUser;

        let result;
        if (isExistingUser) {
            // User đã đăng ký → Gửi OTP đăng nhập
            result = await OTPService.createLoginOTP(phone);
        } else {
            // User chưa đăng ký → Gửi OTP đăng ký
            result = await OTPService.createRegisterOTP(phone);
        }

        res.status(200).json({
            status: 'success',
            message: isExistingUser ? 'Đã gửi mã OTP đăng nhập' : 'Đã gửi mã OTP đăng ký',
            data: {
                phone,
                isExistingUser,
                ...result
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * FLOW MỚI: Xác thực OTP thống nhất
 * - Nếu user đã đăng ký → Trả về userId + user info (đăng nhập thành công)
 * - Nếu user chưa đăng ký → Trả về needsRegistration: true
 */
exports.verifyUnifiedOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại và mã OTP là bắt buộc'
            });
        }

        // Kiểm tra user đã tồn tại chưa
        const existingUser = await User.findOne({ phone });

        if (existingUser) {
            // User đã đăng ký → Xác thực OTP đăng nhập
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

            // Đăng nhập thành công
            return res.json({
                status: 'success',
                message: 'Đăng nhập thành công',
                data: {
                    needsRegistration: false,
                    userId: user._id,
                    user: {
                        _id: user._id,
                        full_name: user.full_name,
                        email: user.email,
                        phone: user.phone,
                        avatar: user.avatar,
                        is_phone_verified: user.is_phone_verified
                    }
                }
            });
        } else {
            // User chưa đăng ký → Xác thực OTP đăng ký
            const isVerified = await OTPService.verifyRegisterOTP(phone, otp);
            if (!isVerified) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Mã OTP không hợp lệ hoặc đã hết hạn'
                });
            }

            // Cần nhập thông tin đăng ký
            return res.json({
                status: 'success',
                message: 'Xác thực OTP thành công, vui lòng nhập thông tin',
                data: {
                    needsRegistration: true
                }
            });
        }
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

/**
 * FLOW MỚI: Hoàn tất đăng ký sau khi verify OTP
 * Chỉ gọi khi verify-otp trả về needsRegistration: true
 */
exports.completeRegistration = async (req, res) => {
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

        // Tìm OTP record đã verify gần đây nhất (trong 10 phút)
        console.log('=== DEBUG: Tìm OTP đã verify ===');
        
        // Debug: Kiểm tra tất cả OTP records
        const allOTPs = await OTP.find({ purpose: 'REGISTER' }).sort({ updatedAt: -1 });
        console.log('Tất cả OTP REGISTER:', allOTPs.map(otp => ({
            phone: otp.phone,
            isVerified: otp.isVerified,
            isUsed: otp.isUsed,
            updatedAt: otp.updatedAt,
            createdAt: otp.createdAt
        })));
        
        const recentVerifiedOTP = await OTPService.findLatestRecentVerifiedOTP();
        console.log('OTP đã verify gần đây:', recentVerifiedOTP);
        
        if (!recentVerifiedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng xác thực OTP trước khi đăng ký'
            });
        }

        // Lấy phone từ OTP record
        const phone = recentVerifiedOTP.phone;

        // Kiểm tra phone có bị đăng ký bởi ai khác không
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại đã được đăng ký bởi tài khoản khác'
            });
        }

        // Tạo user mới
        const user = await User.create({
            full_name,
            email,
            gender,
            phone,
            is_phone_verified: true
        });

        // Đánh dấu OTP đã sử dụng
        recentVerifiedOTP.isUsed = true;
        await recentVerifiedOTP.save();

        res.status(201).json({
            status: 'success',
            message: 'Đăng ký thành công',
            data: {
                userId: user._id,
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone,
                    gender: user.gender,
                    is_phone_verified: user.is_phone_verified
                }
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Debug function để kiểm tra OTP records
exports.debugOTPs = async (req, res) => {
    try {
        const otps = await OTP.find().sort({ createdAt: -1 }).limit(5);
        res.json({
            status: 'success',
            data: { otps }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 