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
    getComments,
    deleteUserComment
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

// UNIFIED comment routes (userId từ body)
router.post('/movies/:movie_id/comment', addComment);    // Add/Update comment (unified)
router.get('/movies/:movie_id/comments', getComments);   // Get comments with pagination & sorting
router.delete('/movies/:movie_id/comment', deleteUserComment); // Delete comment

module.exports = router; 