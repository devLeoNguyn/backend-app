const User = require('../models/User');

// Tạo tài khoản
const createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'Tạo thành công', user });
  } catch (err) {
    res.status(400).json({ message: 'Lỗi tạo', error: err.message });
  }
};

// Cập nhật
const updateUser = async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ message: 'Không được phép' });
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ message: 'Đã cập nhật', user });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật', error: err.message });
  }
};

// Xoá
const deleteUser = async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ message: 'Không được phép' });
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xoá tài khoản' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xoá', error: err.message });
  }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ message: 'Không được phép' });

  if (!req.file) return res.status(400).json({ message: 'Không có ảnh' });

  const avatarPath = `/uploads/avatars/${req.file.filename}`;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { avatar: avatarPath }, { new: true });
    res.json({ message: 'Đã cập nhật avatar', avatar: user.avatar });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi avatar', error: err.message });
  }
};

module.exports = { createUser, updateUser, deleteUser, uploadAvatar };
