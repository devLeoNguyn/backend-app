const express = require('express');
const router = express.Router();
const { 
    updateWatchProgress,
    getWatchProgress,
    getWatchingStats,
    startWatching,
    getWatchingHistory,
    addView,
    getMovieViewCount,
    getEpisodeViewCount,
    getMovieEpisodesViewCount
} = require('../controllers/watching.controller');
const { authenticateToken } = require('../middleware/auth.middleware');


// UNIFIED: Update watching progress - supports both URL params and body
// POST /api/watching/progress (legacy - episodeId in body)
// PUT /api/watching/episodes/:episode_id/progress (new - episode_id in params)
router.post('/progress', authenticateToken, updateWatchProgress);

router.put('/episodes/:episode_id/progress', authenticateToken, updateWatchProgress);

// Get watching progress for a specific episode
router.get('/progress/:episodeId', authenticateToken, getWatchProgress);

// Start watching a new episode
router.post('/start', authenticateToken, startWatching);

// Get watching history with pagination
router.get('/history', authenticateToken, getWatchingHistory);

// ==============================================
// LEGACY ROUTES (for backward compatibility)
// ==============================================

// Continue watching (using history endpoint)
router.get('/continue', authenticateToken, getWatchingHistory);

// Watching stats for an episode
router.get('/stats/:episodeId', authenticateToken, getWatchingStats);

// ==============================================
// VIEW TRACKING ROUTES
// ==============================================

// Add view when completing an episode
router.post('/movies/:movie_id/view', authenticateToken, addView);

// Get movie view count (public)
router.get('/movies/:movie_id/views', getMovieViewCount);

// Get episode view count (public)
router.get('/episodes/:episode_id/views', getEpisodeViewCount);

// Get all episodes view count for a movie (public)
router.get('/movies/:movie_id/episodes/views', getMovieEpisodesViewCount);

module.exports = router; 