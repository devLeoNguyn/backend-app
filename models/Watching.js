const mongoose = require('mongoose');

const watchingSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    episode_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Episode',
        required: true
    },
    current_time: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Tạo compound index để tracking theo user và episode
watchingSchema.index({ user_id: 1, episode_id: 1 }, { unique: true });

module.exports = mongoose.model('Watching', watchingSchema); 