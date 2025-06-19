const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
    episode_title: {
        type: String,
        required: true
    },
    uri: {
        type: String,
        required: true
    },
    episode_number: {
        type: Number,
        required: true
    },
    episode_description: String,
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    duration: {
        type: Number, // Thời lượng tập phim (phút)
        required: true
    }
}, {
    timestamps: true
});

// Index để tối ưu query
episodeSchema.index({ movie_id: 1, episode_number: 1 }, { unique: true });

module.exports = mongoose.model('Episode', episodeSchema);