const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
    genre_name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true // chuẩn hóa
    },
    description: {
        type: String,
        trim: true
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true // Thêm index để query nhanh hơn
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate để lấy danh sách phim thuộc thể loại này
genreSchema.virtual('movies', {
    ref: 'Movie',
    localField: '_id',
    foreignField: 'genres'
});

// Index cho query optimization
genreSchema.index({ is_active: 1, genre_name: 1 });

module.exports = mongoose.model('Genre', genreSchema);