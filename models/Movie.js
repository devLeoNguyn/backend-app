const mongoose = require('mongoose');
const applyMovieMethods = require('./methods/movie.methods');

const movieSchema = new mongoose.Schema({
  movie_title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  production_time: {
    type: Date,
    required: true
  },
  poster_path: {
    type: String
  },
  genres: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Genre'
  }],
  producer: {
    type: String,
    required: true
  },
  movie_type: {
    type: String,
    enum: ['Phim bộ', 'Phim lẻ'],
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Giá phải là số nguyên'
    }
  },
  is_free: {
    type: Boolean,
    default: true
  },
  total_episodes: {
    type: Number,
    min: 1
  }
}, {
  timestamps: true, // Tự động thêm createdAt và updatedAt
  toJSON: { 
    virtuals: true,
    getters: true 
  },
  toObject: { 
    virtuals: true,
    getters: true 
  }
});


applyMovieMethods(movieSchema);


module.exports = mongoose.model('Movie', movieSchema);
