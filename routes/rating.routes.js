const express = require('express');
const router = express.Router();
const { 
    // DEPRECATED FUNCTIONS - Commented out for monitoring period (21/08/2025)
    // createRating,         // DEPRECATED: Use addStarRating instead  
    // deleteRating,         // DEPRECATED: Use deleteStarRating instead
    // likeMovie,            // DEPRECATED: Use toggleLike instead
    // unlikeMovie,          // DEPRECATED: Use toggleLike instead
    
    getMovieRatings,
    toggleLike,        // ⚡ NEW: Toggle like API (replaces likeMovie/unlikeMovie)
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
// DEPRECATED ROUTES - Commented for monitoring period
// router.post('/', createRating);           // DEPRECATED: Use star rating endpoints
// router.delete('/:id', deleteRating);     // DEPRECATED: Use DELETE /movies/:id/star-rating

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
// ❌ NOT USED BY FRONTEND - Admin panel only
// 🔧 CONSIDER: Move to admin routes if not used in main app
router.get('/stats/all-movies', getAllMoviesRatingStats);

// ==============================================
// LEGACY ROUTES (for backward compatibility)
// ==============================================

// ❌ DEPRECATED: Legacy like routes (userId từ body) - Use PUT /movies/:movie_id/like instead
// 🗓️ Date: 21/08/2025 - Commented for monitoring period
// Frontend uses toggleLike (PUT method) which handles both like/unlike in single endpoint
// router.post('/movies/:movie_id/like', likeMovie);        // DEPRECATED
// router.delete('/movies/:movie_id/like', unlikeMovie);    // DEPRECATED  
// router.post('/movies/:movie_id/unlike', unlikeMovie);    // DEPRECATED

// UNIFIED comment routes (userId từ body)
router.post('/movies/:movie_id/comment', addComment);    // Add/Update comment (unified)
router.get('/movies/:movie_id/comments', getComments);   // Get comments with pagination & sorting
router.delete('/movies/:movie_id/comment', deleteUserComment); // Delete comment

module.exports = router; 