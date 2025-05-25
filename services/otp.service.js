const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOtpSMS } = require('./otp.sms.service');

class OTPService {
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static async createOTP(phone) {
        // Kiểm tra số lần gửi OTP trong ngày
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const otpCount = await OTP.countDocuments({
            phone,
            createdAt: { $gte: today }
        });

        if (otpCount >= 5) {
            throw new Error('Đã vượt quá giới hạn gửi OTP trong ngày');
        }

        // Xóa OTP cũ nếu có
        await OTP.deleteMany({ phone });

        // Tạo OTP mới
        const otp = this.generateOTP();
        await OTP.create({
            phone,
            otp
        });

        // Gửi OTP qua SMS
        return await sendOtpSMS(phone, otp);
    }

    static async verifyOTP(phone, otpInput) {
        const otpRecord = await OTP.findOne({ 
            phone,
            isVerified: false
        });

        if (!otpRecord) {
            throw new Error('OTP không tồn tại hoặc đã hết hạn');
        }

        // Kiểm tra số lần thử
        if (otpRecord.attempts >= 3) {
            await OTP.deleteOne({ _id: otpRecord._id });
            throw new Error('Đã vượt quá số lần thử. Vui lòng yêu cầu OTP mới');
        }

        // Tăng số lần thử
        otpRecord.attempts += 1;
        await otpRecord.save();

        // Kiểm tra OTP
        if (otpRecord.otp !== otpInput) {
            throw new Error('OTP không chính xác');
        }

        // Đánh dấu OTP đã được xác thực
        otpRecord.isVerified = true;
        await otpRecord.save();

        return true;
    }

    static async registerWithVerifiedOTP(userData) {
        const { phone } = userData;

        // Kiểm tra OTP đã được xác thực
        const verifiedOTP = await OTP.findOne({
            phone,
            isVerified: true
        });

        if (!verifiedOTP) {
            throw new Error('Vui lòng xác thực OTP trước khi đăng ký');
        }

        // Kiểm tra số điện thoại đã tồn tại
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            throw new Error('Số điện thoại đã được đăng ký');
        }

        // Tạo user mới
        const user = await User.create(userData);

        // Xóa OTP đã sử dụng
        await OTP.deleteOne({ _id: verifiedOTP._id });

        return user;
    }
}

module.exports = OTPService;