const Genre = require('../models/Genre');

// Lấy tất cả thể loại chỉ với trường genre_name
const getAllGenres = async (req, res) => {
  try {
    const genres = await Genre.find({}, 'genre_name');
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy thể loại theo genre_id chỉ với trường genre_name
const getGenreById = async (req, res) => {
  try {
    const genre = await Genre.findOne({ genre_id: req.params.id }, 'genre_name');
    if (!genre) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại' });
    }
    res.json(genre);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Thêm thể loại mới (vẫn lưu đầy đủ các trường)
const createGenre = async (req, res) => {
  try {
    const { genre_id, genre_name, description } = req.body;
    const newGenre = new Genre({ genre_id, genre_name, description });
    await newGenre.save();
    res.status(201).json({ message: 'Thêm thể loại thành công', genre: newGenre });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Xóa thể loại theo genre_id
const deleteGenre = async (req, res) => {
  try {
    const genre = await Genre.findOneAndDelete({ genre_id: req.params.id });
    if (!genre) {
      return res.status(404).json({ message: 'Không tìm thấy thể loại để xóa' });
    }
    res.json({ message: 'Xóa thể loại thành công', genre });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  getAllGenres,
  getGenreById,
  createGenre,
  deleteGenre,
};
