const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  movie_title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  production_time: {
    type: Date,
    required: true
  },
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
    default: 0, // Mặc định là phim freebh
    min: 0, // Giá không thể âm
    validate: {
      validator: function(value) {
        // Giá phải là số nguyên
        return Number.isInteger(value);
      },
      message: 'Giá phải là số nguyên'
    }
  },
  total_episodes: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: function(value) {
        return Number.isInteger(value);
      },
      message: 'Số tập phải là số nguyên'
    }
  },
  is_free: {
    type: Boolean,
    default: true, // Mặc định là phim free
    get: function() {
      return this.price === 0;
    }
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

// Virtual field để hiển thị trạng thái và định dạng giá
movieSchema.virtual('price_display').get(function() {
  if (this.price === 0) {
    return 'Miễn phí';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(this.price);
});

// Middleware để tự động set is_free và movie_type
movieSchema.pre('save', function(next) {
  // Set is_free dựa vào price
  this.is_free = this.price === 0;
  
  // Set movie_type dựa vào total_episodes
  if (this.isModified('total_episodes')) {
    this.movie_type = this.total_episodes > 1 ? 'Phim bộ' : 'Phim lẻ';
  }
  
  next();
});

// Virtual để lấy thông tin episodes
movieSchema.virtual('episodes', {
  ref: 'Episode',
  localField: '_id',
  foreignField: 'movie_id',
  options: { sort: { episode_number: 1 } }
});

module.exports = mongoose.model('Movie', movieSchema);
