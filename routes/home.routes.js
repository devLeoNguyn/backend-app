const express = require('express');
const router = express.Router();
const { 
    getNewReleases,
    getContinueWatching,
    getGenreSections,
    getTrendingMovies,
    getSportsEvents,
    getAnimeHot,
    getVietnameseSeries,
    getComingSoon,
    getTopRatedMovies,
    getTopFavoriteMovies
} = require('../controllers/home.controller');

// 1. API Phim mới ra mắt - Section Banner - Public
// Query params: limit (default: 10), days (default: 30)
router.get('/new-releases', getNewReleases);

// 2. API Đang xem - Private (cần userId trong query)
// Query params: limit (default: 8), userId (required)
router.get('/continue-watching', getContinueWatching);

// 3. API Thể loại - Public
// Query params: genreLimit (default: 4), movieLimit (default: 4)
router.get('/genres', getGenreSections);

// 4. API Phim thịnh hành - Public
// Query params: limit (default: 10)
router.get('/trending', getTrendingMovies);

// 5. API Phim đánh giá cao - Public
// Query params: limit (default: 10)
router.get('/top-rated', getTopRatedMovies);

// 5.1. API Phim được yêu thích nhất - Public - NEW!
// Query params: limit (default: 8), timeRange (week/month/year), showAll (true/false)
router.get('/top-favorites', getTopFavoriteMovies);

// 6. API Sự kiện thể thao - Public
// Query params: limit (default: 10), status (upcoming/live/ended)
router.get('/sports', getSportsEvents);

// 7. API Anime hot - Public
// Query params: limit (default: 8)
router.get('/anime', getAnimeHot);

// 8. API Phim bộ Việt - Public
// Query params: limit (default: 8)
router.get('/vietnamese', getVietnameseSeries);

// 9. API Sắp công chiếu - Public
// Query params: limit (default: 8)
router.get('/coming-soon', getComingSoon);

module.exports = router; 