const express = require('express');
const router = express.Router();
const animeController = require('../controllers/anime.controller');

// Lấy tất cả phim hoạt hình (trending, phim bộ, chiếu rạp)
// GET /api/anime
router.get('/', animeController.getAllAnime);

// Lấy danh sách thể loại phim hoạt hình
// GET /api/anime/categories
router.get('/categories', animeController.getAnimeCategories);

// Lấy danh sách anime phim bộ
// GET /api/anime/series?page=1&limit=10&sort=-createdAt
router.get('/series', animeController.getAnimeSeries);

// Lấy danh sách anime chiếu rạp
// GET /api/anime/movies?page=1&limit=10&sort=-createdAt&price_type=free|paid
router.get('/movies', animeController.getAnimeMovies);

// Lấy anime trending
// GET /api/anime/trending?type=series|movie&price_type=free|paid&limit=8
router.get('/trending', animeController.getTrendingAnime);

// Lấy chi tiết phim hoạt hình
// GET /api/anime/:id
router.get('/:id', animeController.getAnimeDetail);

module.exports = router; 