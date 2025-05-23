const axios = require('axios');

const sendTestSMS = async (phone, otpCode) => {
  const url = 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';

  const body = {
    ApiKey: process.env.ESMS_API_KEY,
    Content: `${otpCode} la ma xac minh dang ky Baotrixemay cua ban`,
    Phone: phone,
    SecretKey: process.env.ESMS_SECRET_KEY,
    Brandname: "Baotrixemay",
    SmsType: "2"
  };

  try {
    const response = await axios.post(url, body);
    return response.data;
  } catch (error) {
    throw error;
  }
};

module.exports = { sendTestSMS };
