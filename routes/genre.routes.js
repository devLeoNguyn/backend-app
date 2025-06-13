const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');

// === PUBLIC ROUTES ===
/**
 * @route   GET /api/genres
 * @desc    Lấy danh sách thể loại với nhiều options
 * @access  Public
 * @query   {
 *   type: 'all' | 'parent' | 'active' (default: 'all')
 *   include_poster: boolean (default: false)
 *   include_children: boolean (default: false)
 *   format: 'tree' | 'list' (default: 'list')
 * }
 */
router.get('/', genreController.getGenres);

/**
 * @route   GET /api/genres/:parentId/children
 * @desc    Lấy danh sách thể loại con của một thể loại cha
 * @access  Public
 */
router.get('/:parentId/children', genreController.getGenreChildren);

/**
 * @route   GET /api/genres/:genreId/movies
 * @desc    Lấy danh sách phim của một thể loại
 * @access  Public
 */
router.get('/:genreId/movies', genreController.getGenreMovies);

// === ADMIN ROUTES (Không yêu cầu xác thực - Dự án sinh viên) ===
/**
 * @route   POST /api/genres
 * @desc    Tạo thể loại mới (có thể là cha hoặc con)
 * @access  Admin (Không yêu cầu xác thực)
 */
router.post('/', genreController.createGenre);

/**
 * @route   PUT /api/genres/:id
 * @desc    Cập nhật thông tin thể loại
 * @access  Admin (Không yêu cầu xác thực)
 */
router.put('/:id', genreController.updateGenre);

/**
 * @route   PUT /api/genres/:id/status
 * @desc    Cập nhật trạng thái thể loại (activate/deactivate/toggle)
 * @access  Admin (Không yêu cầu xác thực)
 */
router.put('/:id/status', genreController.updateStatus);

/**
 * @route   DELETE /api/genres/:id
 * @desc    Xóa thể loại
 * @access  Admin (Không yêu cầu xác thực)
 */
router.delete('/:id', genreController.deleteGenre);

module.exports = router; 