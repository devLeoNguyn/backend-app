const User = require('../../models/User');
const OTPService = require('../../services/otp.service');
const { v4: uuidv4 } = require('uuid');

// Temporary storage cho pending registrations
const pendingRegistrations = new Map();

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
 * - Nếu user chưa đăng ký → Trả về needsRegistration: true + tempToken
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

            // Tạo tempToken để track pending registration
            const tempToken = uuidv4();
            pendingRegistrations.set(tempToken, {
                phone,
                verifiedAt: new Date(),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 phút
            });

            // Cleanup expired tokens
            this.cleanupExpiredTokens();

            // Cần nhập thông tin đăng ký
            return res.json({
                status: 'success',
                message: 'Xác thực OTP thành công, vui lòng nhập thông tin',
                data: {
                    needsRegistration: true,
                    tempToken
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
        const { tempToken, full_name, email, gender } = req.body;

        if (!tempToken) {
            return res.status(400).json({
                status: 'error',
                message: 'tempToken là bắt buộc'
            });
        }

        // Kiểm tra tempToken có hợp lệ không
        const pendingData = pendingRegistrations.get(tempToken);
        if (!pendingData) {
            return res.status(400).json({
                status: 'error',
                message: 'Token không hợp lệ hoặc đã hết hạn'
            });
        }

        // Kiểm tra token có hết hạn không
        if (new Date() > pendingData.expiresAt) {
            pendingRegistrations.delete(tempToken);
            return res.status(400).json({
                status: 'error',
                message: 'Token đã hết hạn, vui lòng thực hiện lại từ đầu'
            });
        }

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

        // Lấy phone từ pending data
        const { phone } = pendingData;

        // Kiểm tra phone có bị đăng ký bởi ai khác trong lúc pending không
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            pendingRegistrations.delete(tempToken);
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

        // Xóa tempToken đã sử dụng
        pendingRegistrations.delete(tempToken);

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

/**
 * Cleanup expired temp tokens
 */
exports.cleanupExpiredTokens = () => {
    const now = new Date();
    for (const [token, data] of pendingRegistrations.entries()) {
        if (now > data.expiresAt) {
            pendingRegistrations.delete(token);
        }
    }
}; 