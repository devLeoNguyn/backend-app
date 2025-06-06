const OTP = require('../models/OTP');
const User = require('../models/User');
const { sendOtpSMS } = require('./otp.sms.service');

class OTPService {
    /**
     * Tạo và gửi OTP cho đăng ký
     */
    static async createRegisterOTP(phone) {
        try {
            // Kiểm tra số điện thoại đã tồn tại
            const existingUser = await User.findOne({ phone });
            if (existingUser) {
                throw new Error('Số điện thoại này đã được đăng ký tài khoản. Vui lòng sử dụng số điện thoại khác hoặc đăng nhập.');
            }

            // Xóa các OTP cũ của số điện thoại này nếu có
            await OTP.deleteMany({ 
                phone,
                purpose: 'REGISTER'
            });

            // Tạo OTP mới
            const otp = this.generateOTP();
            
            // Lưu OTP vào database
            await OTP.create({
                phone,
                otp,
                purpose: 'REGISTER',
                isVerified: false,
                attempts: 0
            });

            // Gửi OTP qua SMS
            return await sendOtpSMS(phone, otp);
        } catch (error) {
            // Chuyển tiếp lỗi để xử lý ở controller
            throw error;
        }
    }

    /**
     * Xác thực OTP cho đăng ký
     */
    static async verifyRegisterOTP(phone, otpInput) {
        // Kiểm tra số điện thoại đã tồn tại
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            throw new Error('Số điện thoại đã được đăng ký');
        }

        // Tìm OTP chưa verify
        const otpRecord = await OTP.findOne({ 
            phone,
            purpose: 'REGISTER',
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

    /**
     * Tìm OTP đã xác thực gần nhất
     */
    static async findLatestVerifiedOTP() {
        return await OTP.findOne({
            purpose: 'REGISTER',
            isVerified: true
        }).sort({ createdAt: -1 });
    }

    /**
     * Đăng ký với OTP đã xác thực
     */
    static async registerWithVerifiedOTP(userData) {
        const { email } = userData;

        // Kiểm tra email đã tồn tại
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            throw new Error('Email đã được sử dụng');
        }

        // Tìm OTP đã xác thực gần nhất
        const verifiedOTP = await this.findLatestVerifiedOTP();
        if (!verifiedOTP) {
            throw new Error('Vui lòng xác thực OTP trước khi đăng ký');
        }

        // Kiểm tra OTP có thực sự đã được xác thực
        if (!verifiedOTP.isVerified) {
            throw new Error('OTP chưa được xác thực');
        }

        // Kiểm tra số điện thoại từ OTP đã xác thực có tồn tại chưa
        const existingPhone = await User.findOne({ phone: verifiedOTP.phone });
        if (existingPhone) {
            throw new Error('Số điện thoại đã được đăng ký');
        }

        // Tạo user mới với số điện thoại từ OTP đã xác thực
        const user = await User.create({
            ...userData,
            phone: verifiedOTP.phone,
            is_phone_verified: true  // Đánh dấu số điện thoại đã xác thực
        });

        // Xóa OTP đã sử dụng
        await OTP.deleteOne({ _id: verifiedOTP._id });

        return user;
    }

    /**
     * Tạo OTP ngẫu nhiên 6 số
     */
    static generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Tạo OTP cho đăng nhập
    static async createLoginOTP(phone) {
        // Kiểm tra user có tồn tại không
        const user = await User.findOne({ phone });
        if (!user) {
            throw new Error('Số điện thoại chưa được đăng ký');
        }

        // Xóa OTP đăng nhập cũ nếu có
        await OTP.deleteMany({ phone, purpose: 'LOGIN' });

        // Tạo OTP mới cho đăng nhập
        const otp = this.generateOTP();
        await OTP.create({
            phone,
            otp,
            purpose: 'LOGIN',
            user_id: user._id
        });

        // Gửi OTP qua SMS
        return await sendOtpSMS(phone, otp);
    }

    // Xác thực OTP cho đăng nhập
    static async verifyLoginOTP(phone, otpInput) {
        const otpRecord = await OTP.findOne({ 
            phone,
            purpose: 'LOGIN',
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

        // Lấy thông tin user
        const user = await User.findById(otpRecord.user_id);
        if (!user) {
            throw new Error('User không tồn tại');
        }

        // Xóa OTP đã sử dụng
        await OTP.deleteOne({ _id: otpRecord._id });

        return user;
    }

    // Tìm OTP đăng ký đã verify gần đây nhất
    static async findLatestRecentVerifiedOTP() {
        return await OTP.findOne({
            purpose: 'REGISTER',
            isVerified: true,
            isUsed: { $ne: true } // Chưa được sử dụng
        }).sort({ createdAt: -1 });
    }

    // Tìm OTP đăng ký đã verify gần đây (trong 10 phút) - theo phone cụ thể
    static async findRecentVerifiedOTP(phone) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        
        return await OTP.findOne({
            phone,
            purpose: 'REGISTER',
            isVerified: true,
            isUsed: { $ne: true }, // Chưa được sử dụng
            createdAt: { $gte: tenMinutesAgo } // Trong 10 phút gần đây - sử dụng createdAt
        }).sort({ createdAt: -1 });
    }
}

module.exports = OTPService;