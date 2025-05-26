const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  genre_id: { type: String, required: true, unique: true },  // duy nhất, bắt buộc
  genre_name: { type: String, required: true },
  description: { type: String }
});

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;
