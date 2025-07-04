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
    is_like: {
        type: Boolean,
        required: true
    },
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

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