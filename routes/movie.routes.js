const express = require('express');
const router = express.Router();
const { 
    getNewWeekMovies, 
    createMovieController, 
    getMovieById, 
    updateMovie, 
    deleteMovie 
} = require('../controllers/movie.controller');

// Lấy danh sách phim mới
router.get('/new-week', getNewWeekMovies);

// Thêm phim mới
router.post('/', createMovieController);

// Lấy chi tiết phim
router.get('/:id', getMovieById);

// Cập nhật phim
router.put('/:id', updateMovie);

// Xóa phim
router.delete('/:id', deleteMovie);

module.exports = router;
