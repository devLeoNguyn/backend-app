const registerController = require('./register.controller');
const loginController = require('./login.controller');
const otpController = require('./otp.controller');
const unifiedAuthController = require('./unified.controller');
// const tokenController = require('./token.controller'); // Removed token controller

module.exports = {
    // DEPRECATED EXPORTS - Đã chuyển sang unified flow (21/08/2025)
    // TODO: Comment out để tránh conflict, xóa sau khi xác nhận không có client reference
    // ...registerController,  // DEPRECATED: register, registerWithOTP
    // ...loginController,     // DEPRECATED: loginWithOTP, requestLoginOTP (giữ traditionalLogin)
    // ...otpController,       // DEPRECATED: sendRegisterOTP, verifyRegisterOTP, verifyOTP
    
    // KEEP THESE - Vẫn đang sử dụng
    traditionalLogin: loginController.traditionalLogin, // Admin login với email/password
    logout: loginController.logout, // Logout simple
    ...unifiedAuthController // sendUnifiedOTP, verifyUnifiedOTP, completeRegistration
    // ...tokenController // Removed token controller exports
}; 