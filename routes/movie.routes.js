const express = require('express');
const router = express.Router();
const { 
    getNewWeekMovies, 
    createMovieController, 
    getMovieById, 
    updateMovie, 
    deleteMovie 
} = require('../controllers/movie.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// === PUBLIC ROUTES (Không cần đăng nhập) ===
// Lấy danh sách phim mới - ai cũng xem được
router.get('/new-week', getNewWeekMovies);

// Lấy chi tiết phim
router.get('/:id', getMovieById);

// === PROTECTED ROUTES (Cần đăng nhập) ===
// Thêm phim mới
router.post('/', authenticateToken, createMovieController);

// Cập nhật phim
router.put('/:id', authenticateToken, updateMovie);

// Xóa phim
router.delete('/:id', authenticateToken, deleteMovie);

module.exports = router;
