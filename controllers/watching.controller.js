const mongoose = require('mongoose');
const Watching = require('../models/Watching');
const Episode = require('../models/Episode');
const Movie = require('../models/Movie');

const getWatchingList = async (req, res) => {
  const { user_id } = req.params;

  try {
    const watchingList = await Watching.find({ user_id });

    const result = await Promise.all(watchingList.map(async (watch) => {
      const episode = await Episode.findById(watch.episode_id);
      if (!episode) return null;

      const movie = await Movie.findById(episode.movie_id);
      if (!movie) return null;

      return {
        episode_id: episode._id,
        episode_title: episode.episode_title,
        episode_uri: episode.uri,
        current_time: watch.current_time,
        movie_title: movie.movie_title,
        movie_id: movie._id
      };
    }));

    res.status(200).json(result.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const saveOrUpdateWatching = async (req, res) => {
  const { user_id, episode_id, current_time } = req.body;

  if (!user_id || !episode_id || current_time === undefined) {
    return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
  }

  try {
    const updated = await Watching.findOneAndUpdate(
      { user_id, episode_id },
      {
        current_time,
        updated_at: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: 'Đã lưu trạng thái đang xem',
      data: updated
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { getWatchingList, saveOrUpdateWatching };
