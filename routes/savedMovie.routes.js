const express = require('express');
const router = express.Router();
const { getAllSavedMovies, addSavedMovie, removeSavedMovie } = require('../controllers/savedMovie.controller');

// Lấy toàn bộ danh sách phim 'xem sau' của user
router.get('/', getAllSavedMovies);
// Thêm phim vào danh sách 'xem sau'
router.post('/add', addSavedMovie);
// Xóa phim khỏi danh sách 'xem sau'
router.delete('/remove', removeSavedMovie);

module.exports = router; 