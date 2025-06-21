const mongoose = require('mongoose');
const applyMovieMethods = require('./methods/movie.methods');

const movieSchema = new mongoose.Schema({
  movie_title: {
    type: String,
    required: true,
    trim: true
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
    type: String,
    required: true
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
    enum: ['Phim bộ', 'Phim lẻ', 'Thể thao'],
    required: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  is_free: {
    type: Boolean,
    default: function () {
      return this.price === 0;
    }
  },
  price_display: {
    type: String,
    get: function () {
      return this.is_free ? 'Miễn phí' : `${this.price.toLocaleString('vi-VN')} VNĐ`;
    }
  },
  total_episodes: {
    type: Number,
    min: 1
  },
  release_status: {
    type: String,
    enum: ['upcoming', 'released', 'ended'],
    default: 'released',
    index: true
  },
  event_start_time: {
    type: Date,
    default: null
  },
  event_status: {
    type: String,
    enum: ['upcoming', 'released'],
    default: null
  },
  view_count: {
    type: Number,
    default: 0
  },
  favorite_count: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true
  },
  toObject: {
    virtuals: true,
    getters: true
  }
});

// Indexes for better query performance
movieSchema.index({ release_status: 1, production_time: -1 });
movieSchema.index({ movie_type: 1, createdAt: -1 });
movieSchema.index({ movie_type: 1, event_start_time: 1 });
movieSchema.index({ movie_title: 'text', description: 'text', producer: 'text' }); // full-text search

// Custom methods
applyMovieMethods(movieSchema);

module.exports = mongoose.model('Movie', movieSchema);
