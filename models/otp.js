const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  id_nguoi_dung: { type: String, required: true },  // hoặc mongoose.Schema.Types.ObjectId nếu liên kết User
  otp_code: { type: String, required: true },
  is_used: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  expired_at: { type: Date, required: true }
});

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
