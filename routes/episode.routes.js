const express = require('express');
const router = express.Router();
const { 
    getEpisodeById, 
    createEpisode, 
    updateEpisode, 
    deleteEpisode 
} = require('../controllers/episode.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Public routes
router.get('/:id', getEpisodeById);

// Protected routes
router.post('/', authenticateToken, createEpisode);
router.put('/:id', authenticateToken, updateEpisode);
router.delete('/:id', authenticateToken, deleteEpisode);

module.exports = router;
