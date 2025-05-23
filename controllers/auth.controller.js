const bcrypt = require('bcrypt');
const User = require('../models/User');

exports.register = async (req, res) => {
  console.log('REQ BODY:', req.body); 
  try {
    const { full_name, email, password, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      full_name,
      email,
      password: hashed,
      phone
    });

    res.status(201).json({
      message: 'Registered',
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
        // Không gửi password ra ngoài!
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
