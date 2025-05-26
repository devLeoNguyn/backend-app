const express = require('express');
const router = express.Router();
const {
  addFavorite,
  getFavoritesByUser,
  removeFavorite
} = require('../controllers/favorite.controller');

router.post('/add', addFavorite);                // Thêm yêu thích
router.get('/:user_id', getFavoritesByUser);     // Lấy yêu thích theo user
router.delete('/remove', removeFavorite);        // Xóa yêu thích

module.exports = router;
