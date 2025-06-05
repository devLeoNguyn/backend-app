const registerController = require('./register.controller');
const loginController = require('./login.controller');
const otpController = require('./otp.controller');
const unifiedAuthController = require('./unified.controller');
// const tokenController = require('./token.controller'); // Removed token controller

module.exports = {
    ...registerController,
    ...loginController,
    ...otpController,
    ...unifiedAuthController
    // ...tokenController // Removed token controller exports
}; 