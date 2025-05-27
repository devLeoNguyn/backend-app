const registerController = require('./register.controller');
const loginController = require('./login.controller');
const otpController = require('./otp.controller');
const tokenController = require('./token.controller');

module.exports = {
    ...registerController,
    ...loginController,
    ...otpController,
    ...tokenController
}; 