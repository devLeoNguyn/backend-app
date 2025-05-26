const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
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
    added_at: {
        type: Date, //de sap xep theo thu tu 
        default: Date.now
    }
}, {
    timestamps: true
});

// Đảm bảo một user không thể thêm cùng một phim vào yêu thích nhiều lần
favoriteSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);