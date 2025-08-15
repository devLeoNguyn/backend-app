const express = require('express');
const router = express.Router();
const seriesController = require('../controllers/series.controller');
const rateLimit = require('express-rate-limit');

// Middleware rate limit: tối đa 10 request mỗi phút cho mỗi IP
const bannerSeriesLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 phút
	max: 10, // tối đa 10 request
	message: {
		success: false,
		message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.'
	}
});

// === API CHO MÀN HÌNH PHIM BỘ ===

// 1. Banner cho màn hình phim bộ - Chỉ phim bộ mới nhất
router.get('/banner-series', bannerSeriesLimiter, seriesController.getBannerSeries);

// 2. Trending Series - Phim bộ thịnh hành (hỗ trợ showAll=true)
router.get('/trending', seriesController.getTrendingSeries);

// 3. Vietnamese Series - Phim bộ Việt Nam (hỗ trợ showAll=true)
router.get('/vietnamese', seriesController.getVietnameseSeries);

// 4. Anime Series - Phim bộ anime (hỗ trợ showAll=true)
router.get('/anime', seriesController.getAnimeSeries);

// 5. Korean Series - Phim bộ Hàn Quốc (hỗ trợ showAll=true)
router.get('/korean', seriesController.getKoreanSeries);

module.exports = router; 