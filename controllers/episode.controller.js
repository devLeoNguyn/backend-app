const Episode = require('../models/Episode');

// Lấy chi tiết một tập phim
const getEpisodeById = async (req, res) => {
    try {
        const episode = await Episode.findById(req.params.id)
            .select('episode_title uri episode_number episode_description');

        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                episode
            }
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error fetching episode',
            error: err.message
        });
    }
};

// Thêm một tập phim mới
const createEpisode = async (req, res) => {
    try {
        const episodeData = {
            episode_title: req.body.episode_title,
            uri: req.body.uri,
            episode_number: req.body.episode_number,
            episode_description: req.body.episode_description,
            movie_id: req.body.movie_id
        };

        const newEpisode = await Episode.create(episodeData);

        res.status(201).json({
            status: 'success',
            data: {
                episode: newEpisode
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Error creating episode',
            error: err.message
        });
    }
};

// Cập nhật thông tin tập phim
const updateEpisode = async (req, res) => {
    try {
        const updatedEpisode = await Episode.findByIdAndUpdate(
            req.params.id,
            {
                episode_title: req.body.episode_title,
                uri: req.body.uri,
                episode_number: req.body.episode_number,
                episode_description: req.body.episode_description
            },
            { new: true, runValidators: true }
        );

        if (!updatedEpisode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                episode: updatedEpisode
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Error updating episode',
            error: err.message
        });
    }
};

// Xóa một tập phim
const deleteEpisode = async (req, res) => {
    try {
        const episode = await Episode.findByIdAndDelete(req.params.id);

        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Episode deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error deleting episode',
            error: err.message
        });
    }
};

module.exports = {
    getEpisodeById,
    createEpisode,
    updateEpisode,
    deleteEpisode
}; 