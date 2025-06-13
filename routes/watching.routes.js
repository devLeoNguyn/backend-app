const express = require('express');
const router = express.Router();
const { 
    updateWatchProgress,
    getWatchProgress,
    getWatchingStats,
    getWatchingHistory,
    addView,
    getMovieViewCount,
    getEpisodeViewCount,
    getMovieEpisodesViewCount
} = require('../controllers/watching.controller');

// UNIFIED: Update watching progress - supports both URL params and body
// POST /api/watching/progress (legacy - episodeId in body) - userId từ body  
// PUT /api/watching/episodes/:episode_id/progress (new - episode_id in params) - userId từ body
// NOTE: current_time = 0 means start watching, > 0 means update progress
router.post('/progress', updateWatchProgress);
router.put('/episodes/:episode_id/progress', updateWatchProgress);

// Get watching progress for a specific episode - userId từ query
router.get('/progress/:episodeId', getWatchProgress);

// Get watching history with pagination - userId từ query
// ?type=continue: chỉ lấy phim chưa hoàn thành để tiếp tục xem
router.get('/history', getWatchingHistory);

// ==============================================
// LEGACY ROUTES (for backward compatibility)
// ==============================================

// Continue watching (using history endpoint with type=continue) - userId từ query
router.get('/continue', (req, res, next) => {
    req.query.type = 'continue';
    getWatchingHistory(req, res, next);
});

// Watching stats for an episode - userId từ query
router.get('/stats/:episodeId', getWatchingStats);

// ==============================================
// VIEW TRACKING ROUTES
// ==============================================

// Add view when completing an episode - userId từ body
router.post('/movies/:movie_id/view', addView);

// Get movie view count (public)
router.get('/movies/:movie_id/views', getMovieViewCount);

// Get episode view count (public)
router.get('/episodes/:episode_id/views', getEpisodeViewCount);

// Get all episodes view count for a movie (public)
router.get('/movies/:movie_id/episodes/views', getMovieEpisodesViewCount);

module.exports = router; 