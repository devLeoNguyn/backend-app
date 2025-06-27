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

/**
 * @swagger
 * /api/anime/banner-anime:
 *   get:
 *     tags: [Anime]
 *     summary: Lấy banner hoạt hình
 *     description: Lấy danh sách phim hoạt hình mới nhất cho banner và grid
 *     parameters:
 *       - in: query
 *         name: bannerLimit
 *         schema:
 *           type: integer
 *         description: Số lượng phim tối đa cho banner
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng phim tối đa cho grid
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Số ngày gần đây để lọc phim mới
 *       - in: query
 *         name: showAll
 *         schema:
 *           type: boolean
 *         description: Hiển thị tất cả phim không giới hạn số lượng
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     banner:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Hoạt hình mới ra mắt
 *                         type:
 *                           type: string
 *                           example: banner_list
 *                         movies:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/BannerMovie'
 *                     recommended:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Hoạt hình dành cho bạn
 *                         type:
 *                           type: string
 *                           example: grid
 *                         movies:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/GridMovie'
 *       500:
 *         description: Lỗi server
 */
router.get('/banner-anime', animeController.getBannerAnime);

// Lấy chi tiết phim hoạt hình (đặt cuối cùng để tránh conflict với routes khác)
// GET /api/anime/:id
router.get('/:id', animeController.getAnimeDetail);

module.exports = router; 