const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');

// Lấy danh sách anime phim bộ
exports.getAnimeSeries = async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
        const skip = (page - 1) * limit;

        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Query cho anime phim bộ
        const query = { 
            genres: { $in: animeGenreIds },
            movie_type: 'Phim bộ',
            release_status: 'released'
        };

        // Thực hiện query
        const [animeList, total] = await Promise.all([
            Movie.find(query)
                .populate('genres', 'genre_name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Movie.countDocuments(query)
        ]);

        // Format response
        const formattedAnime = animeList.map(anime => ({
            _id: anime._id,
            title: anime.movie_title,
            description: anime.description,
            poster: anime.poster_path,
            genres: anime.genres.map(g => g.genre_name),
            total_episodes: anime.total_episodes,
            price: anime.price,
            is_free: anime.is_free,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            createdAt: anime.createdAt
        }));

        res.status(200).json({
            status: 'success',
            data: {
                anime: formattedAnime,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error in getAnimeSeries:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách anime phim bộ'
        });
    }
};

// Lấy danh sách anime chiếu rạp (phân loại theo phí)
exports.getAnimeMovies = async (req, res) => {
    try {
        const { page = 1, limit = 10, sort = '-createdAt', price_type } = req.query;
        const skip = (page - 1) * limit;

        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Query cho anime chiếu rạp
        const query = { 
            genres: { $in: animeGenreIds },
            movie_type: 'Phim lẻ',
            release_status: 'released'
        };

        // Thêm điều kiện lọc theo phí
        if (price_type === 'free') {
            query.price = 0;
        } else if (price_type === 'paid') {
            query.price = { $gt: 0 };
        }

        // Thực hiện query
        const [animeList, total] = await Promise.all([
            Movie.find(query)
                .populate('genres', 'genre_name')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Movie.countDocuments(query)
        ]);

        // Format response
        const formattedAnime = animeList.map(anime => ({
            _id: anime._id,
            title: anime.movie_title,
            description: anime.description,
            poster: anime.poster_path,
            genres: anime.genres.map(g => g.genre_name),
            price: anime.price,
            is_free: anime.is_free,
            price_display: anime.price === 0 ? 'Miễn phí' : `${anime.price.toLocaleString('vi-VN')} VNĐ`,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            createdAt: anime.createdAt
        }));

        res.status(200).json({
            status: 'success',
            data: {
                anime: formattedAnime,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error in getAnimeMovies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách anime chiếu rạp'
        });
    }
};

// Lấy chi tiết phim hoạt hình
exports.getAnimeDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Tìm phim
        const anime = await Movie.findOne({
            _id: id,
            genres: { $in: animeGenreIds }
        }).populate('genres', 'genre_name description');

        if (!anime) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim hoạt hình'
            });
        }

        // Lấy danh sách tập phim nếu là phim bộ
        let episodes = [];
        if (anime.movie_type === 'Phim bộ') {
            episodes = await Episode.find({ movie_id: id })
                .select('episode_title uri episode_number episode_description duration')
                .sort({ episode_number: 1 });
        }

        // Format response
        const formattedAnime = {
            _id: anime._id,
            title: anime.movie_title,
            description: anime.description,
            poster: anime.poster_path,
            genres: anime.genres.map(g => ({
                _id: g._id,
                name: g.genre_name,
                description: g.description
            })),
            type: anime.movie_type,
            total_episodes: anime.total_episodes,
            price: anime.price,
            is_free: anime.is_free,
            price_display: anime.price === 0 ? 'Miễn phí' : `${anime.price.toLocaleString('vi-VN')} VNĐ`,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            release_status: anime.release_status,
            producer: anime.producer,
            episodes: episodes.map(ep => ({
                number: ep.episode_number,
                title: ep.episode_title,
                description: ep.episode_description,
                duration: ep.duration,
                uri: anime.is_free ? ep.uri : null,
                is_locked: !anime.is_free
            })),
            createdAt: anime.createdAt,
            updatedAt: anime.updatedAt
        };

        res.status(200).json({
            status: 'success',
            data: formattedAnime
        });
    } catch (error) {
        console.error('Error in getAnimeDetail:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy chi tiết phim hoạt hình'
        });
    }
};

// Lấy anime trending (phim bộ và chiếu rạp)
exports.getTrendingAnime = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const type = req.query.type; // 'series' hoặc 'movie'
        const price_type = req.query.price_type; // 'free' hoặc 'paid'

        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Xây dựng query
        const query = {
            genres: { $in: animeGenreIds },
            release_status: 'released'
        };

        // Thêm điều kiện type
        if (type === 'series') {
            query.movie_type = 'Phim bộ';
        } else if (type === 'movie') {
            query.movie_type = 'Phim lẻ';
        }

        // Thêm điều kiện lọc theo phí
        if (price_type === 'free') {
            query.price = 0;
        } else if (price_type === 'paid') {
            query.price = { $gt: 0 };
        }

        // Lấy anime trending dựa trên lượt xem và yêu thích trong 7 ngày gần nhất
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trendingAnime = await Movie.find(query)
            .sort({ view_count: -1, favorite_count: -1 })
            .limit(limit)
            .populate('genres', 'genre_name')
            .lean();

        // Format response
        const formattedTrending = trendingAnime.map(anime => ({
            _id: anime._id,
            title: anime.movie_title,
            poster: anime.poster_path,
            genres: anime.genres.map(g => g.genre_name),
            type: anime.movie_type,
            total_episodes: anime.total_episodes,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            price: anime.price,
            is_free: anime.is_free,
            price_display: anime.price === 0 ? 'Miễn phí' : `${anime.price.toLocaleString('vi-VN')} VNĐ`
        }));

        res.status(200).json({
            status: 'success',
            data: formattedTrending
        });
    } catch (error) {
        console.error('Error in getTrendingAnime:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy anime trending'
        });
    }
};

// Lấy tất cả phim hoạt hình theo các loại
exports.getAllAnime = async (req, res) => {
    try {
        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Query cơ bản cho tất cả anime
        const baseQuery = { 
            genres: { $in: animeGenreIds },
            release_status: 'released'
        };

        // Lấy anime trending (top 8)
        const trendingAnime = await Movie.find(baseQuery)
            .sort({ view_count: -1, favorite_count: -1 })
            .limit(8)
            .populate('genres', 'genre_name')
            .lean();

        // Lấy anime phim bộ
        const animeSeries = await Movie.find({
            ...baseQuery,
            movie_type: 'Phim bộ'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('genres', 'genre_name')
            .lean();

        // Lấy anime chiếu rạp
        const animeMovies = await Movie.find({
            ...baseQuery,
            movie_type: 'Phim lẻ'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('genres', 'genre_name')
            .lean();

        // Format response
        const formatAnime = (anime) => ({
            _id: anime._id,
            title: anime.movie_title,
            description: anime.description,
            poster: anime.poster_path,
            genres: anime.genres.map(g => g.genre_name),
            type: anime.movie_type,
            total_episodes: anime.total_episodes,
            price: anime.price,
            is_free: anime.is_free,
            price_display: anime.price === 0 ? 'Miễn phí' : `${anime.price.toLocaleString('vi-VN')} VNĐ`,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            createdAt: anime.createdAt
        });

        res.status(200).json({
            status: 'success',
            data: {
                trending: trendingAnime.map(formatAnime),
                series: animeSeries.map(formatAnime),
                movies: animeMovies.map(formatAnime)
            }
        });
    } catch (error) {
        console.error('Error in getAllAnime:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách phim hoạt hình'
        });
    }
};

// Lấy danh sách thể loại phim hoạt hình
exports.getAnimeCategories = async (req, res) => {
    try {
        // Tìm tất cả genres hoạt hình
        const animeGenres = await Genre.find({ genre_name: /hoạt hình/i });
        if (!animeGenres || animeGenres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt hình'
            });
        }

        const animeGenreIds = animeGenres.map(g => g._id);

        // Query cơ bản cho tất cả anime
        const baseQuery = { 
            genres: { $in: animeGenreIds },
            release_status: 'released'
        };

        // Lấy anime trending (top 8)
        const trendingAnime = await Movie.find(baseQuery)
            .sort({ view_count: -1, favorite_count: -1 })
            .limit(8)
            .populate('genres', 'genre_name')
            .lean();

        // Lấy anime phim bộ
        const animeSeries = await Movie.find({
            ...baseQuery,
            movie_type: 'Phim bộ'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('genres', 'genre_name')
            .lean();

        // Lấy anime chiếu rạp
        const animeMovies = await Movie.find({
            ...baseQuery,
            movie_type: 'Phim lẻ'
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('genres', 'genre_name')
            .lean();

        // Format response
        const formatAnime = (anime) => ({
            _id: anime._id,
            title: anime.movie_title,
            description: anime.description,
            poster: anime.poster_path,
            genres: anime.genres.map(g => g.genre_name),
            type: anime.movie_type,
            total_episodes: anime.total_episodes,
            price: anime.price,
            is_free: anime.is_free,
            price_display: anime.price === 0 ? 'Miễn phí' : `${anime.price.toLocaleString('vi-VN')} VNĐ`,
            view_count: anime.view_count,
            favorite_count: anime.favorite_count,
            createdAt: anime.createdAt
        });

        // Format categories
        const categories = [
            {
                id: 'trending',
                title: 'Anime Trending',
                description: 'Top anime được xem nhiều nhất',
                type: 'grid',
                movies: trendingAnime.map(formatAnime)
            },
            {
                id: 'series',
                title: 'Anime Bộ',
                description: 'Phim hoạt hình nhiều tập',
                type: 'grid',
                movies: animeSeries.map(formatAnime)
            },
            {
                id: 'movies',
                title: 'Anime Chiếu Rạp',
                description: 'Phim hoạt hình một tập',
                type: 'grid',
                movies: animeMovies.map(formatAnime)
            }
        ];

        res.status(200).json({
            status: 'success',
            data: categories
        });
    } catch (error) {
        console.error('Error in getAnimeCategories:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại phim hoạt hình'
        });
    }
}; 