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
    }
});

module.exports = mongoose.model('Episode', episodeSchema);