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
      episode_number: episode.episode_number,
      episode_title: episode.episode_title,
      episode_description: episode.episode_description,
      uri: this.isFreeMovie() ? episode.uri : null,
      is_locked: !this.isFreeMovie()
    };
  };

  schema.methods.formatMovieResponse = function (episodes = []) {
    const data = this.toObject();

    data.movie_type = this.getMovieType();
    data.is_free = this.isFreeMovie();
    data.price_display = this.getPriceDisplay();

    if (data.movie_type === 'Phim bộ') {
      episodes.sort((a, b) => a.episode_number - b.episode_number);
      data.episodes = episodes.map(ep => this.formatEpisodeInfo(ep));
    } else {
      const ep = episodes[0] || {};
      data.uri = this.isFreeMovie() ? ep.uri : null;
      data.episode_description = ep.episode_description || '';
    }

    return data;
  };
};
