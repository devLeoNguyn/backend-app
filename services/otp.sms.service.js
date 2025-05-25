// services/sms.service.js
const axios = require('axios');

const sendOtpSMS = async (phone, otp) => {
  const API_KEY = process.env.ESMS_API_KEY;
  const SECRET_KEY = process.env.ESMS_SECRET_KEY;

  // Chuyển đổi số điện thoại sang format quốc tế nếu cần
  const formattedPhone = phone.startsWith('0') ? '84' + phone.slice(1) : phone;

  const smsBody = {
    ApiKey: API_KEY,
    SecretKey: SECRET_KEY,
    Content: `${otp} la ma xac minh dang ky Baotrixemay cua ban`,
    Phone: formattedPhone,
    Brandname: "Baotrixemay",
    SmsType: "2"
  };

  try {
    const response = await axios.post(
      'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/',
      smsBody
    );

    // Log response để debug
    console.log('SMS API Response:', response.data);

    // Kiểm tra response
    if (response.data.CodeResult === '100') {
      return {
        success: true,
        message: 'Gửi OTP thành công',
        data: response.data
      };
    } else {
      console.log('SMS Error Response:', response.data);
      return {
        success: false,
        message: 'Gửi OTP thất bại',
        data: response.data
      };
    }
  } catch (error) {
    console.error('SMS Error:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Gửi OTP thất bại',
      data: error.response?.data || { ErrorMessage: error.message }
    };
  }
};

module.exports = { sendOtpSMS };
