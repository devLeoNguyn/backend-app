const SavedMovie = require('../models/SavedMovie');

// Lấy toàn bộ danh sách phim 'xem sau' của user
exports.getAllSavedMovies = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ status: 'error', message: 'userId là bắt buộc' });
    const list = await SavedMovie.find({ user_id: userId }).populate('movie_id');
    res.json({ status: 'success', data: list });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Thêm phim vào danh sách 'xem sau'
exports.addSavedMovie = async (req, res) => {
  try {
    const { userId, movieId } = req.body;
    if (!userId || !movieId) return res.status(400).json({ status: 'error', message: 'userId và movieId là bắt buộc' });
    const doc = await SavedMovie.findOneAndUpdate(
      { user_id: userId, movie_id: movieId },
      { saved_at: new Date() },
      { upsert: true, new: true }
    );
    res.json({ status: 'success', data: doc });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Xóa phim khỏi danh sách 'xem sau'
exports.removeSavedMovie = async (req, res) => {
  try {
    const { userId, movieId } = req.body;
    if (!userId || !movieId) return res.status(400).json({ status: 'error', message: 'userId và movieId là bắt buộc' });
    await SavedMovie.deleteOne({ user_id: userId, movie_id: movieId });
    res.json({ status: 'success', message: 'Đã xóa phim khỏi danh sách xem sau' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}; 