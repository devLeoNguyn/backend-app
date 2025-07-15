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
    // Giữ lại field cũ để tương thích ngược với hệ thống like/unlike
    is_like: {
        type: Boolean,
        default: true
    },
    // Thêm star rating từ 1-5 sao
    star_rating: {
        type: Number,
        min: 1,
        max: 5,
        validate: {
            validator: function(v) {
                return v === null || v === undefined || (Number.isInteger(v) && v >= 1 && v <= 5);
            },
            message: 'Star rating phải là số nguyên từ 1 đến 5'
        }
    },
    comment: {
        type: String,
        trim: true
    },
    // Thêm field để phân biệt loại rating
    rating_type: {
        type: String,
        enum: ['like', 'star', 'comment_only'],
        default: 'like'
    }
}, {
    timestamps: true
});

// Index compound để đảm bảo một user chỉ có thể rate một phim một lần với mỗi loại rating
ratingSchema.index({ user_id: 1, movie_id: 1, rating_type: 1 });

// Virtual để tính average rating
ratingSchema.statics.getMovieAverageRating = async function(movieId) {
    const result = await this.aggregate([
        { 
            $match: { 
                movie_id: new mongoose.Types.ObjectId(movieId),
                star_rating: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$movie_id',
                averageRating: { $avg: '$star_rating' },
                totalRatings: { $sum: 1 },
                ratingDistribution: {
                    $push: '$star_rating'
                }
            }
        }
    ]);
    
    if (result.length === 0) {
        return {
            averageRating: 0,
            totalRatings: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    }
    
    const data = result[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.ratingDistribution.forEach(rating => {
        distribution[rating] = (distribution[rating] || 0) + 1;
    });
    
    return {
        averageRating: Math.round(data.averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
        totalRatings: data.totalRatings,
        ratingDistribution: distribution
    };
};

// XÓA index unique nếu còn tồn tại (chạy 1 lần khi server start)
const mongooseInstance = require('mongoose');
mongooseInstance.connection.on('open', async () => {
  try {
    await mongooseInstance.connection.collection('ratings').dropIndex('user_id_1_movie_id_1');
    console.log('Dropped unique index user_id_1_movie_id_1 on ratings');
  } catch (err) {
    // Không sao nếu index không tồn tại
  }
});

module.exports = mongoose.model('Rating', ratingSchema); 