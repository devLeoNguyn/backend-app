const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
    createRating,
    updateRating,
    deleteRating,
    getMovieRatings,
} = require('../controllers/rating.controller');

// PUBLIC
router.get('/movie/:movie_id', getMovieRatings);

// PROTECTED
// Thêm đánh giá mới
router.post('/', authenticateToken, createRating);

// Cập nhật đánh giá
router.put('/:id', authenticateToken, updateRating);

// Xóa đánh giá
router.delete('/:id', authenticateToken, deleteRating);




module.exports = router; 