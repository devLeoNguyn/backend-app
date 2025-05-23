const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
  genre_id: { type: String, required: true, unique: true },
  genre_name: { type: String, required: true },

});

const Genre = mongoose.model('Genre', genreSchema);

module.exports = Genre;
