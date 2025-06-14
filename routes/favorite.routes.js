const express = require('express');
const router = express.Router();
const {
    addToFavorites,
    getFavorites,
    removeFromFavorites,
    checkFavorite
} = require('../controllers/favorite.controller');

// Thêm phim vào danh sách yêu thích (userId từ body)
router.post('/', addToFavorites);

// Lấy danh sách phim yêu thích (userId từ query)
router.get('/', getFavorites);

// Xóa phim khỏi danh sách yêu thích (userId từ body)
router.delete('/:movie_id', removeFromFavorites);

// Kiểm tra phim có trong danh sách yêu thích không (userId từ query)
router.get('/check/:movie_id', checkFavorite);

// ==============================================
// LEGACY ROUTES (for backward compatibility)
// ==============================================

// Alternative add route (RESTful style)
router.post('/movies/:movie_id/add', (req, res) => {
    req.body.movie_id = req.params.movie_id;
    addToFavorites(req, res);
});

// Alternative remove route (POST instead of DELETE for some clients)
router.post('/movies/:movie_id/remove', (req, res) => {
    req.params.movie_id = req.params.movie_id;
    removeFromFavorites(req, res);
});

module.exports = router; 