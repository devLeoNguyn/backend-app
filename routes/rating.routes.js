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
    deleteUserComment,
    // Star Rating Functions (NEW)
    addStarRating,
    getUserStarRating,
    getMovieStarRatings,
    deleteStarRating,
    getAllMoviesRatingStats
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
// STAR RATING APIS (NEW)
// ==============================================

// Thêm/cập nhật đánh giá sao cho phim
router.post('/movies/:movie_id/stars', addStarRating);
router.put('/movies/:movie_id/stars', addStarRating); // Cùng function để hỗ trợ cả POST và PUT

// Lấy đánh giá sao của user cho một phim
router.get('/movies/:movie_id/stars/user', getUserStarRating);

// Lấy thống kê và danh sách đánh giá sao của một phim
router.get('/movies/:movie_id/stars', getMovieStarRatings);

// Xóa đánh giá sao của user
router.delete('/movies/:movie_id/stars', deleteStarRating);

// Lấy thống kê rating của tất cả phim (cho admin)
router.get('/stats/all-movies', getAllMoviesRatingStats);

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