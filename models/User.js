const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  phone: String
});

module.exports = mongoose.model('User', userSchema);
