const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  movie_id: { type: String, required: true }
});

// Đảm bảo 1 user không thích trùng 1 movie
favoriteSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

module.exports = Favorite;
