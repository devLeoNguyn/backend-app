const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
    addToFavorites,
    getFavorites,
    removeFromFavorites,
    checkFavorite
} = require('../controllers/favorite.controller');

// Tất cả routes yêu cầu xác thực
router.use(authenticateToken);

// Thêm phim vào yêu thích
router.post('/', addToFavorites);

// Lấy danh sách phim yêu thích
router.get('/', getFavorites);

// Kiểm tra phim có trong yêu thích không
router.get('/:movie_id/check', checkFavorite);

// Xóa phim khỏi yêu thích
router.delete('/:movie_id', removeFromFavorites);

module.exports = router; 