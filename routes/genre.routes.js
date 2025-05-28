const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Route lấy phim theo >1  thể loại note: truoc pram
router.get('/movies', genreController.getMoviesByGenres);

// CRUD genre
router.post('/', authenticateToken, genreController.createGenre);
router.get('/', genreController.getAllGenres);
router.get('/:id', genreController.getGenreById);
router.put('/:id', authenticateToken, genreController.updateGenre);
router.delete('/:id', authenticateToken, genreController.deleteGenre);

// Route lấy phim theo một thể loại
router.get('/:genre_id/movies', genreController.getMoviesByGenre);

module.exports = router; 