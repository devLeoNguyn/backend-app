module.exports = function applyMovieMethods(schema) {
  schema.methods.getPriceDisplay = function () {
    return this.price === 0
      ? 'Miễn phí'
      : new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(this.price);
  };

  schema.methods.isFreeMovie = function () {
    return this.price === 0;
  };
//   Xác định loại phim dựa vào số tập
  schema.methods.getMovieType = function () {
    return this.total_episodes > 1 ? 'Phim bộ' : 'Phim lẻ';
  };
// truyền từng tập cho frontend mà không lộ link khi chưa trả tiền
  schema.methods.formatEpisodeInfo = function (episode = []) {
    return {
      _id: episode._id, // 🔧 FIX: Include episode _id for frontend identification
      episode_number: episode.episode_number,
      episode_title: episode.episode_title,
      episode_description: episode.episode_description,
      duration: episode.duration,
      // subtitle: lấy từ Cloudflare API, không lưu trong DB
      uri: this.isFreeMovie() ? episode.uri : null,
      is_locked: !this.isFreeMovie(),
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt
    };
  };

  schema.methods.formatMovieResponse = function (episodes = []) {
    const data = this.toObject();

    // Preserve the stored movie_type from DB instead of recomputing from total_episodes
    // This avoids incorrectly overriding values like 'Thể thao' when editing
    data.movie_type = this.movie_type;
    data.is_free = this.isFreeMovie();
    data.price_display = this.getPriceDisplay();

    if (data.movie_type === 'Phim bộ') {
      episodes.sort((a, b) => a.episode_number - b.episode_number);
      data.episodes = episodes.map(ep => this.formatEpisodeInfo(ep));
      data.total_episodes = episodes.length;
    } else {
      const ep = episodes[0] || {};
      data.uri = this.isFreeMovie() ? ep.uri : null;
      data.episode_description = ep.episode_description || '';
      data.duration = ep.duration || 0;
      // data.subtitle: lấy từ Cloudflare API, không lưu trong DB
      if (ep._id) {
        data.episode_info = this.formatEpisodeInfo(ep);
      }
    }

    return data;
  };
};
