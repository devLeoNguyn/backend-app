const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');

// === PUBLIC ROUTES (Không cần đăng nhập) ===

// Lấy danh sách thể loại hoạt động (cho user)
router.get('/active', genreController.getActiveGenres);

// === NEW HIERARCHICAL ROUTES ===

// Lấy cây thể loại đầy đủ (parent + children)
router.get('/tree', genreController.getGenreTree);

// Lấy danh sách thể loại cha (cho HomeScreen)
router.get('/parents', genreController.getParentGenres);

// Lấy danh sách thể loại con theo parent (cho GenreChildrenScreen)
router.get('/parent/:parentId/children', genreController.getChildrenGenres);

// Lấy phim theo thể loại (bao gồm thể loại con nếu có)
router.get('/:genreId/movies', genreController.getMoviesByGenreIncludeChildren);

// Lấy phim theo nhiều thể loại (hoạt động)
router.get('/movies', genreController.getMoviesByGenres);

// Lấy tất cả thể loại (có thể bao gồm inactive nếu có query param)
router.get('/', genreController.getAllGenres);

// === PROTECTED ROUTES (Cần userId) ===

// CRUD operations (userId từ body)
router.post('/', genreController.createGenre);

// Tạo thể loại con
router.post('/child', genreController.createChildGenre);

router.put('/:id', genreController.updateGenre);
router.delete('/:id', genreController.deleteGenre);

// Genre status management (userId từ body)
router.put('/:id/toggle', genreController.toggleGenreStatus);
router.put('/:id/activate', genreController.activateGenre);
router.put('/:id/deactivate', genreController.deactivateGenre);

module.exports = router; 