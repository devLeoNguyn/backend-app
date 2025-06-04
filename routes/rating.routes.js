const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const { 
    createRating,
    // updateRating,
    deleteRating,
    getMovieRatings,
    likeMovie,
    unlikeMovie,
    addComment,
    getComments
} = require('../controllers/rating.controller');

// PUBLIC
router.get('/movie/:movie_id', getMovieRatings);

// PROTECTED
// Thêm đánh giá mới
router.post('/', authenticateToken, createRating);

// Cập nhật đánh giá
// router.put('/:id', authenticateToken, updateRating);

// Xóa đánh giá
router.delete('/:id', authenticateToken, deleteRating);

// New like routes
router.post('/movies/:movie_id/like', authenticateToken, likeMovie);
router.delete('/movies/:movie_id/like', authenticateToken, unlikeMovie);

// New comment routes
router.post('/movies/:movie_id/comment', authenticateToken, addComment);
router.get('/movies/:movie_id/comments', getComments);

module.exports = router; 