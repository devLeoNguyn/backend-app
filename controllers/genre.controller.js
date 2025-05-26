const Genre = require('../models/Genre');


// Thêm genre mới
const addGenre = async (req, res) => {
  try {
    const { genre_id, genre_name, description } = req.body;

    if (!genre_id || !genre_name) {
      return res.status(400).json({ message: 'Thiếu genre_id hoặc genre_name' });
    }

    // Tạo mới
    const newGenre = new Genre({ genre_id, genre_name, description });
    await newGenre.save();

    res.status(201).json({ message: 'Đã thêm genre', genre: newGenre });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'genre_id đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Cập nhật theo genre_id
const updateGenre = async (req, res) => {
  try {
    const { genre_id } = req.params;
    const { genre_name, description } = req.body;

    const updated = await Genre.findOneAndUpdate(
      { genre_id },
      { genre_name, description },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Không tìm thấy genre để cập nhật' });
    }

    res.json({ message: 'Cập nhật thành công', genre: updated });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Lấy tất cả genres
const getGenres = async (req, res) => {
  try {
    const genres = await Genre.find({});
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

// Xóa genre theo genre_id
const deleteGenre = async (req, res) => {
  try {
    const { genre_id } = req.params;

    const deleted = await Genre.findOneAndDelete({ genre_id });
    if (!deleted) {
      return res.status(404).json({ message: 'Không tìm thấy genre để xóa' });
    }

    res.json({ message: 'Xóa thành công', genre: deleted });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { addGenre, updateGenre, getGenres, deleteGenre };
