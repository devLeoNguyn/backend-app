const bcrypt = require('bcrypt');
const User = require('../models/User');
const OTPService = require('../services/otp.service');

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

// Gửi OTP
exports.sendOTP = async (req, res) => {
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

        const result = await OTPService.createOTP(phone);

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

// Xác thực OTP
exports.verifyOTP = async (req, res) => {
  try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                status: 'error',
                message: 'Số điện thoại và mã OTP là bắt buộc'
            });
        }

        await OTPService.verifyOTP(phone, otp);

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
        const { full_name, email, password, phone } = req.body;

        // Validate dữ liệu
        if (!full_name || !email || !password || !phone) {
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

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                status: 'error',
                message: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await OTPService.registerWithVerifiedOTP({
            full_name,
            email,
            password: hashedPassword,
            phone
        });

        res.status(201).json({
            status: 'success',
            message: 'Đăng ký thành công',
            data: {
                user: {
                    _id: user._id,
                    full_name: user.full_name,
                    email: user.email,
                    phone: user.phone
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
