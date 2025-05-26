const Favorite = require('../models/Favorite');

// Thêm movie yêu thích cho user
const addFavorite = async (req, res) => {
  try {
    const { user_id, movie_id } = req.body;
    if (!user_id || !movie_id) {
      return res.status(400).json({ message: 'Thiếu user_id hoặc movie_id' });
    }
    const newFav = new Favorite({ user_id, movie_id });
    await newFav.save();
    res.status(201).json({ message: 'Đã thêm yêu thích', favorite: newFav });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Yêu thích đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy danh sách movie yêu thích của user
const getFavoritesByUser = async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const favorites = await Favorite.find({ user_id });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Xóa movie yêu thích theo user_id và movie_id
const removeFavorite = async (req, res) => {
  try {
    const { user_id, movie_id } = req.body;
    if (!user_id || !movie_id) {
      return res.status(400).json({ message: 'Thiếu user_id hoặc movie_id' });
    }
    const deleted = await Favorite.findOneAndDelete({ user_id, movie_id });
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy yêu thích để xóa' });
    }
    res.json({ message: 'Đã xóa yêu thích', favorite: deleted });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { addFavorite, getFavoritesByUser, removeFavorite };
