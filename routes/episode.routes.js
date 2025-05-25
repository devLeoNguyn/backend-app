const express = require('express');
const router = express.Router();
const episodeController = require('../controllers/episode.controller');

// Lấy chi tiết một tập phim
router.get('/:id', episodeController.getEpisodeById);

// Thêm tập phim mới
router.post('/', episodeController.createEpisode);

// Cập nhật thông tin tập phim
router.put('/:id', episodeController.updateEpisode);

// Xóa tập phim
router.delete('/:id', episodeController.deleteEpisode);

module.exports = router; 