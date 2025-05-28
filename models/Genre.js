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



module.exports = mongoose.model('Genre', genreSchema);