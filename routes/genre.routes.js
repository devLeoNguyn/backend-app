const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');
const { getMoviesByGenre } = require('../controllers/movie.controller');

// === PUBLIC ROUTES ===
/**
 * @route   GET /api/genres
 * @desc    Lấy danh sách thể loại với nhiều options
 * @access  Public
 * @query   {
 *   type: 'all' | 'parent' | 'active' | 'children' (default: 'all')
 *   parent_id: ObjectId (chỉ dùng khi type='children')
 *   include_poster: boolean (default: false)
 *   format: 'tree' | 'list' (default: 'list')
 * }
 * @example
 * 1. Lấy tất cả thể loại:
 *    GET /api/genres
 * 2. Lấy thể loại cha:
 *    GET /api/genres?type=parent
 * 3. Lấy thể loại con của một thể loại cha:
 *    GET /api/genres?type=children&parent_id=123
 * 4. Lấy thể loại cha dạng cây (bao gồm con):
 *    GET /api/genres?type=parent&format=tree
 */
router.get('/', genreController.getGenres);

/**
 * @route   GET /api/genres/:id/movies
 * @desc    Lấy danh sách phim theo thể loại
 * @access  Public
 * @params  id: ObjectId (genre ID)
 * @query   {
 *   include_children: boolean (default: false) - Có lấy phim của thể loại con không
 *   page: number (default: 1) - Trang hiện tại
 *   limit: number (default: 10) - Số phim mỗi trang
 *   sort: string (default: '-createdAt') - Sắp xếp theo trường nào
 * }
 */
router.get('/:id/movies', getMoviesByGenre);

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