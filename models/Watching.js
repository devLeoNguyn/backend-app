const mongoose = require('mongoose');

const WatchingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  episode_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
  current_time: Number,
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Watching', WatchingSchema);
