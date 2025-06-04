const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// === PUBLIC ROUTES (Không cần đăng nhập) ===

// Lấy danh sách thể loại hoạt động (cho user)
router.get('/active', genreController.getActiveGenres);

// Lấy phim theo nhiều thể loại (hoạt động)
router.get('/movies', genreController.getMoviesByGenres);


// Lấy tất cả thể loại (có thể bao gồm inactive nếu có query param)
router.get('/', genreController.getAllGenres);

// === PROTECTED ROUTES (Cần đăng nhập - Admin) ===

// CRUD operations
router.post('/', authenticateToken, genreController.createGenre);
router.put('/:id', authenticateToken, genreController.updateGenre);
router.delete('/:id', authenticateToken, genreController.deleteGenre);

// Genre status management
router.put('/:id/toggle', authenticateToken, genreController.toggleGenreStatus);
router.put('/:id/activate', authenticateToken, genreController.activateGenre);
router.put('/:id/deactivate', authenticateToken, genreController.deactivateGenre);

module.exports = router; 