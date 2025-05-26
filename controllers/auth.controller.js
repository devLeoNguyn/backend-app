const bcrypt = require('bcrypt');
const User = require('../models/User');
const OTPService = require('../services/otp.service');
const TokenService = require('../services/token.service');
const { 
    generateAccessToken, 
    generateRefreshToken, 
    verifyRefreshToken 
} = require('../utils/jwt.utils');

exports.register = async (req, res) => {

  try {
    const { full_name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      email,
      password: hashed,
      phone
    });

    res.status(201).json({
      message: 'Registered',
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
        // Không gửi password ra ngoài!
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

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

// Đăng ký với OTP đã xác thực
exports.registerWithOTP = async (req, res) => {
    try {
        const { full_name, email, password } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        // Validate dữ liệu
        if (!full_name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng điền đầy đủ thông tin'
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tìm OTP đã xác thực gần nhất
        const verifiedOTP = await OTPService.findLatestVerifiedOTP();
        if (!verifiedOTP) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng xác thực OTP trước khi đăng ký'
            });
        }

        // Đăng ký user mới với số điện thoại từ OTP đã xác thực
        const user = await OTPService.registerWithVerifiedOTP({
            full_name,
            email,
            password: hashedPassword,
            phone: verifiedOTP.phone
        });

        // Tạo tokens và lưu refresh token
        const tokens = await TokenService.createTokens(user, deviceInfo);

        res.status(201).json({
            status: 'success',
            message: 'Đăng ký thành công',
            data: {
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone
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

// === OTP ĐĂNG NHẬP ===

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

// Đăng nhập bằng OTP
exports.loginWithOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const deviceInfo = req.headers['user-agent'] || 'Unknown device';

        if (!phone || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng nhập đầy đủ thông tin'
            });
        }

        // Xác thực OTP và lấy user
        const user = await OTPService.verifyLoginOTP(phone, otp);

        // Tạo tokens và lưu refresh token
        const tokens = await TokenService.createTokens(user, deviceInfo);

        res.status(200).json({
            status: 'success',
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone
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

// === TOKEN MANAGEMENT ===

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

        // Tạo cặp token mới
        const tokens = await TokenService.createTokens(user, deviceInfo);

        res.status(200).json({
            status: 'success',
            message: 'Refresh token thành công',
            data: { tokens }
        });
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: error.message
        });
    }
};

// Đăng xuất
exports.logout = async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (refresh_token) {
            // Thu hồi refresh token hiện tại
            await TokenService.revokeToken(refresh_token);
        }

        res.status(200).json({
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

        res.status(200).json({
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
