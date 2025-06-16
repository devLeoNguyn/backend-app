const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/series.controller');

// === API CHO MÀN HÌNH PHIM BỘ ===

// 1. Banner cho màn hình phim bộ - Chỉ phim bộ mới nhất
router.get('/banner-series', seriesController.getBannerSeries);

// 2. Trending Series - Phim bộ thịnh hành (hỗ trợ showAll=true)
router.get('/trending', seriesController.getTrendingSeries);

// 3. Vietnamese Series - Phim bộ Việt Nam (hỗ trợ showAll=true)
router.get('/vietnamese', seriesController.getVietnameseSeries);

// 4. Anime Series - Phim bộ anime (hỗ trợ showAll=true)
router.get('/anime', seriesController.getAnimeSeries);

// 5. Korean Series - Phim bộ Hàn Quốc (hỗ trợ showAll=true)
router.get('/korean', seriesController.getKoreanSeries);

module.exports = router; 