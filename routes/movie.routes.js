const express = require('express');
const router = express.Router();
const { 
    getNewWeekMovies, 
    createMovieController,
    createSportsEvent,
    getMovieById, 
    updateMovie, 
    deleteMovie,
    getMovieStats
} = require('../controllers/movie.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// === PUBLIC ROUTES (Không cần đăng nhập) ===

// Lấy danh sách phim mới - ai cũng xem được
router.get('/new-week', getNewWeekMovies);

// Lấy chi tiết một phim - ai cũng xem được
router.get('/:id', getMovieById);

// Get movie stats (likes, views, comments) - Public
router.get('/:movie_id/stats', getMovieStats);

// === ADMIN ROUTES (Cần đăng nhập và quyền admin) ===

// Tạo phim mới - chỉ admin
router.post('/', authenticateToken, createMovieController);

// Tạo sự kiện thể thao - chỉ admin
router.post('/sports-event', authenticateToken, createSportsEvent);

// Cập nhật phim - chỉ admin
router.put('/:id', authenticateToken, updateMovie);

// Xóa phim - chỉ admin
router.delete('/:id', authenticateToken, deleteMovie);

module.exports = router;
