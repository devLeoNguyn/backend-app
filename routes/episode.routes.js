const express = require('express');
const router = express.Router();
const { 
    getEpisodeById, 
    createEpisode, 
    updateEpisode, 
    deleteEpisode 
} = require('../controllers/episode.controller');

// Public routes
router.get('/:id', getEpisodeById);

// Protected routes (userId từ body)
router.post('/', createEpisode);
router.put('/:id', updateEpisode);
router.delete('/:id', deleteEpisode);

module.exports = router;
