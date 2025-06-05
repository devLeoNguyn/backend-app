const express = require('express');
const router = express.Router();
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

// PROTECTED - cần userId
// Thêm đánh giá mới (userId từ body)
router.post('/', createRating);

// Cập nhật đánh giá
// router.put('/:id', updateRating);

// Xóa đánh giá (userId từ body)
router.delete('/:id', deleteRating);

// New like routes (userId từ body)
router.post('/movies/:movie_id/like', likeMovie);
router.delete('/movies/:movie_id/like', unlikeMovie);

// New comment routes (userId từ body)
router.post('/movies/:movie_id/comment', addComment);
router.get('/movies/:movie_id/comments', getComments);

module.exports = router; 