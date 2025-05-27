const mongoose = require('mongoose');

const movieGenreSchema = new mongoose.Schema({
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    genre_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Genre',
        required: true
    }
}, {
    timestamps: true
});

// Tạo compound index để đảm bảo một bộ phim không thể có cùng một thể loại nhiều lần
movieGenreSchema.index({ movie_id: 1, genre_id: 1 }, { unique: true });

module.exports = mongoose.model('MovieGenre', movieGenreSchema); 