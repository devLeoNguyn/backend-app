const express = require('express');
const router = express.Router();

const {
  addGenre,
  updateGenre,
  getGenres,
  deleteGenre
} = require('../controllers/genre.controller');  // ../controllers nếu genre.controller.js ở controllers

router.post('/add', addGenre);
router.put('/update/:genre_id', updateGenre);
router.get('/', getGenres);
router.delete('/delete/:genre_id', deleteGenre);

module.exports = router;
