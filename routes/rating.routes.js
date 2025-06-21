const express = require('express');
const router = express.Router();
const { 
    createRating,
    // updateRating,
    deleteRating,
    getMovieRatings,
    toggleLike,        // ⚡ NEW: Toggle like API
    likeMovie,         // Legacy
    unlikeMovie,       // Legacy
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

// ==============================================
// NEW UNIFIED INTERACTION APIS
// ==============================================

// ⚡ NEW: Toggle like/unlike in one API (RESTful)
router.put('/movies/:movie_id/like', toggleLike);

// ==============================================
// LEGACY ROUTES (for backward compatibility)
// ==============================================

// Legacy like routes (userId từ body)
router.post('/movies/:movie_id/like', likeMovie);
router.delete('/movies/:movie_id/like', unlikeMovie); // Backward compatibility
router.post('/movies/:movie_id/unlike', unlikeMovie); // 🆕 FIX: Add correct POST endpoint for unlike

// UNIFIED comment routes (userId từ body)
router.post('/movies/:movie_id/comment', addComment);    // Add/Update comment (unified)
router.get('/movies/:movie_id/comments', getComments);   // Get comments with pagination & sorting
router.delete('/movies/:movie_id/comment', deleteUserComment); // Delete comment

module.exports = router; 