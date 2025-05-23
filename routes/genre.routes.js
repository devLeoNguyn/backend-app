const express = require('express');
const router = express.Router();
const { getAllGenres, getGenreById, createGenre, deleteGenre } = require('../controllers/genre.controller');

router.get('/', getAllGenres);
router.get('/:id', getGenreById);
router.post('/', createGenre);
router.delete('/:id', deleteGenre);

module.exports = router;
