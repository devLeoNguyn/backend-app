const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    star: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Tạo compound index để đảm bảo một user chỉ có thể đánh giá một bộ phim một lần
ratingSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema); 