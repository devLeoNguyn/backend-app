const mongoose = require('mongoose');
const savedMovieSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movie_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
  saved_at: { type: Date, default: Date.now }
});
savedMovieSchema.index({ user_id: 1, movie_id: 1 }, { unique: true });
module.exports = mongoose.model('SavedMovie', savedMovieSchema); 