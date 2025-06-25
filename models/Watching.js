const mongoose = require('mongoose');
const applyWatchingMethods = require('./methods/watching.methods');

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
    },
    duration: {
        type: Number,
        required: true,
        min: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    last_watched: {
        type: Date,
        default: Date.now
    },
    watch_count: {
        type: Number,
        default: 1
    },
    watch_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Tạo compound index để tracking theo user và episode
watchingSchema.index({ user_id: 1, episode_id: 1 }, { unique: true });
watchingSchema.index({ movie_id: 1, completed: 1 }); // Để đếm lượt xem hoàn thành theo phim
watchingSchema.index({ last_watched: -1 }); // Để query phim xem gần đây

// Statics method để cập nhật view count cho Movie
watchingSchema.statics.updateMovieViewCount = async function(movieId) {
    const completedViews = await this.countDocuments({
        movie_id: movieId,
        completed: true
    });
    
    await mongoose.model('Movie').findByIdAndUpdate(movieId, {
        view_count: completedViews
    });
};

// Áp dụng các methods
applyWatchingMethods(watchingSchema);

module.exports = mongoose.model('Watching', watchingSchema); 