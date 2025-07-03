const express = require('express');
const router = express.Router();
const { 
    getNewWeekMovies, 
    createMovieController,
    createSportsEvent,
    getMovieById, 
    updateMovie, 
    deleteMovie,
    getMovieStats,
    searchMovies,
    getMovieDetailWithInteractions,
    getMoviesByGenre,
    getMovieLinking,
    getSportsMovies,
    getNbaMovies,
    getFootballMovies,
    getRelatedMovies
} = require('../controllers/movie.controller');

// === PUBLIC ROUTES (Không cần đăng nhập) ===

// Lấy toàn bộ phim thể thao - đặt trước các route có :id
router.get('/sports', getSportsMovies);

// Lấy danh sách phim NBA
router.get('/nba-list', getNbaMovies);

// Lấy danh sách phim bóng đá
router.get('/football-list', getFootballMovies);

// Lấy danh sách phim mới - ai cũng xem được
router.get('/new-week', getNewWeekMovies);

// Tìm kiếm phim
router.get('/search', searchMovies);

// Get movie detail with all interactions - Public/Protected (MUST BE BEFORE /:id)
router.get('/:id/detail-with-interactions', getMovieDetailWithInteractions);

// Lấy chi tiết một phim - ai cũng xem được
router.get('/:id', getMovieById);

// Get movie stats (likes, views, comments) - Public
router.get('/:movie_id/stats', getMovieStats);

// Linking chia sẻ phim
router.get('/:id/linking', getMovieLinking);

// Get related movies
router.get('/:id/related', getRelatedMovies);

// === ADMIN ROUTES (Cần userId) ===

// Tạo phim mới - userId từ body
router.post('/', createMovieController);

// Tạo sự kiện thể thao - userId từ body
router.post('/sports-event', createSportsEvent);

// Cập nhật phim - userId từ body
router.put('/:id', updateMovie);

// Xóa phim - userId từ body
router.delete('/:id', deleteMovie);

module.exports = router;
