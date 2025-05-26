const { sendTestSMS } = require('../untils/smsHelper');

const sendOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Thiếu số điện thoại hoặc mã OTP' });
    }

    // Gọi hàm gửi SMS test
    const result = await sendTestSMS(phone, otp);

    // Trả về phản hồi thành công kèm data từ API SMS
    return res.status(200).json({
      message: 'Gửi mã OTP thành công',
      data: result
    });
  } catch (error) {
    // Nếu lỗi thì trả về mã lỗi 500 cùng thông tin lỗi
    return res.status(500).json({
      message: 'Gửi mã OTP thất bại',
      error: error.message || error.toString()
    });
  }
};

module.exports = {
  sendOtp,
};
