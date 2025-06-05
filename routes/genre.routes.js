const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');

// === PUBLIC ROUTES (Không cần đăng nhập) ===

// Lấy danh sách thể loại hoạt động (cho user)
router.get('/active', genreController.getActiveGenres);

// Lấy phim theo nhiều thể loại (hoạt động)
router.get('/movies', genreController.getMoviesByGenres);

// Lấy tất cả thể loại (có thể bao gồm inactive nếu có query param)
router.get('/', genreController.getAllGenres);

// === PROTECTED ROUTES (Cần userId) ===

// CRUD operations (userId từ body)
router.post('/', genreController.createGenre);
router.put('/:id', genreController.updateGenre);
router.delete('/:id', genreController.deleteGenre);

// Genre status management (userId từ body)
router.put('/:id/toggle', genreController.toggleGenreStatus);
router.put('/:id/activate', genreController.activateGenre);
router.put('/:id/deactivate', genreController.deactivateGenre);

module.exports = router; 