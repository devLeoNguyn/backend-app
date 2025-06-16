const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');

// Import shared utility functions từ home controller
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount
} = require('../utils/movieStatsUtils');

// Helper: Lấy danh sách phim bộ (chỉ movie_type = 'Phim bộ')
async function getSeriesBaseQuery(filter = {}) {
    // Luôn filter chỉ lấy phim bộ
    const seriesFilter = { ...filter, movie_type: 'Phim bộ' };
    
    const movies = await Movie.find(seriesFilter)
        .populate('genres', 'genre_name')
        .lean();
    return movies.map(m => ({
        _id: m._id,
        movie_title: m.movie_title,
        description: m.description,
        poster_path: m.poster_path,
        genres: m.genres,
        country: m.country || null,
        total_episodes: m.total_episodes || 1,
        view_count: m.view_count || 0,
        favorite_count: m.favorite_count || 0,
        release_status: m.release_status || null,
        price: m.price || 0,
        is_free: m.is_free || false,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
    }));
}

// === API CHO MÀN HÌNH PHIM BỘ ===

/**
 * 1. 🎬 Banner cho màn hình phim bộ - Chỉ phim bộ mới nhất
 * @route GET /api/series/banner-series
 */
const getBannerSeries = async (req, res) => {
    try {
        const bannerLimit = parseInt(req.query.bannerLimit) || 5;
        const gridLimit = parseInt(req.query.limit) || 6;
        const days = parseInt(req.query.days) || 30;

        // Tính thời điểm bắt đầu (days ngày trước)
        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Tìm phim bộ mới được thêm vào
        const newSeries = await Movie.find({
            movie_type: 'Phim bộ', // Chỉ lấy phim bộ
            release_status: 'released',
            createdAt: { $gte: fromDate }
        })
            .populate('genres', 'genre_name')
            .select('movie_title poster_path description production_time movie_type producer genres createdAt')
            .sort({ createdAt: -1 })
            .limit(bannerLimit + gridLimit)
            .lean();

        // Xử lý dữ liệu cho banner
        const bannerSeries = newSeries.slice(0, bannerLimit).map(series => ({
            movieId: series._id,
            title: series.movie_title || '',
            poster: series.poster_path || '',
            description: series.description || '',
            releaseYear: (series.production_time && !isNaN(Date.parse(series.production_time)))
                ? new Date(series.production_time).getFullYear()
                : null,
            movieType: series.movie_type || '',
            producer: series.producer || '',
            genres: Array.isArray(series.genres)
                ? series.genres.slice(0, 3).map(g => g.genre_name || '')
                : []
        }));

        // Xử lý dữ liệu cho grid đề xuất
        const gridSeries = newSeries.slice(0, gridLimit).map(series => ({
            movieId: series._id,
            title: series.movie_title || '',
            poster: series.poster_path || '',
            movieType: series.movie_type || '',
            producer: series.producer || ''
        }));

        res.json({
            status: 'success',
            data: {
                banner: {
                    title: "Phim bộ mới ra mắt",
                    type: "banner_list",
                    movies: bannerSeries
                },
                recommended: {
                    title: "Phim bộ dành cho bạn",
                    type: "grid",
                    movies: gridSeries
                }
            }
        });
    } catch (error) {
        console.error('Banner series error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy banner phim bộ',
            error: error.message
        });
    }
};

/**
 * 2. 🔥 Trending Series - Phim bộ thịnh hành
 * @route GET /api/series/trending
 * @query showAll=true để xem tất cả
 */
const getTrendingSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8; // Nếu showAll thì lấy nhiều, không thì 8

        // Lấy phim bộ để tính view count
        const allSeries = await Movie.find({ 
            movie_type: 'Phim bộ',
            release_status: 'released' 
        })
            .select('_id movie_title poster_path movie_type producer')
            .limit(showAll ? 200 : 50); // Giới hạn query để performance

        // Tính rating và view count cho từng phim bộ
        const seriesWithStats = await Promise.all(
            allSeries.map(async (series) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),
                    calculateViewCount(series._id)
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    movieType: series.movie_type,
                    producer: series.producer,
                    viewCount
                };
            })
        );

        // Sort theo view count và lấy top
        const trendingSeries = seriesWithStats
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit)
            .map(series => ({
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: showAll ? "Tất cả phim bộ thịnh hành" : "Phim bộ đang thịnh hành",
                type: "grid",
                showAll: showAll,
                total: trendingSeries.length,
                movies: trendingSeries
            }
        });
    } catch (error) {
        console.error('Error fetching trending series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ thịnh hành',
            error: error.message
        });
    }
};

/**
 * 3. 🇻🇳 Vietnamese Series - Phim bộ Việt Nam
 * @route GET /api/series/vietnamese
 * @query showAll=true để xem tất cả
 */
const getVietnameseSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8;

        // Tìm phim bộ Việt Nam
        const vietnamSeries = await Movie.find({
            movie_type: 'Phim bộ', // Chỉ lấy phim bộ
            release_status: 'released',
            $or: [
                { producer: /việt nam/i },
                { producer: /vietnam/i },
                { movie_title: /việt/i },
                { movie_title: /vietnam/i },
                { description: /việt nam/i },
                { description: /vietnam/i },
                { description: /phim việt/i }
            ]
        })
            .select('_id movie_title poster_path producer movie_type')
            .sort({ createdAt: -1 })
            .limit(showAll ? 200 : 50);

        // Tính rating và view count
        const seriesWithStats = await Promise.all(
            vietnamSeries.map(async (series) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),
                    calculateViewCount(series._id)
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    producer: series.producer,
                    movieType: series.movie_type,
                    rating: ratingData.rating,
                    viewCount: viewCount
                };
            })
        );

        // Sort theo rating và lấy limit
        const simpleVietnameseSeries = seriesWithStats
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit)
            .map(series => ({
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: showAll ? "Tất cả phim bộ Việt Nam" : "Phim bộ Việt Nam",
                type: "grid",
                showAll: showAll,
                total: simpleVietnameseSeries.length,
                movies: simpleVietnameseSeries
            }
        });
    } catch (error) {
        console.error('Error fetching Vietnamese series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ Việt Nam',
            error: error.message
        });
    }
};

/**
 * 4. 🌸 Anime Series - Phim bộ anime
 * @route GET /api/series/anime
 * @query showAll=true để xem tất cả
 */
const getAnimeSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8;

        // Tìm genre anime/hoạt hình
        const animeGenre = await Genre.findOne({ genre_name: /hoạt hình/i });
        let animeSeries = [];

        if (animeGenre) {
            animeSeries = await Movie.find({ 
                movie_type: 'Phim bộ', // Chỉ lấy phim bộ
                genres: animeGenre._id,
                release_status: 'released' 
            })
                .select('_id movie_title poster_path movie_type producer')
                .sort({ createdAt: -1 })
                .limit(showAll ? 200 : 50);
        }

        // Tính rating và view count
        const animeWithStats = await Promise.all(
            animeSeries.map(async (series) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),
                    calculateViewCount(series._id)
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    movieType: series.movie_type,
                    producer: series.producer,
                    rating: ratingData.rating,
                    viewCount: viewCount
                };
            })
        );

        // Sort theo popularity (viewCount) và lấy limit
        const simpleAnimeSeries = animeWithStats
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit)
            .map(series => ({
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: showAll ? "Tất cả phim bộ Anime" : "Phim bộ Anime",
                type: "grid",
                showAll: showAll,
                total: simpleAnimeSeries.length,
                movies: simpleAnimeSeries
            }
        });
    } catch (error) {
        console.error('Error fetching anime series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ anime',
            error: error.message
        });
    }
};

/**
 * 5. 🇰🇷 Korean Series - Phim bộ Hàn Quốc
 * @route GET /api/series/korean
 * @query showAll=true để xem tất cả
 */
const getKoreanSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8;

        // Tìm phim bộ Hàn Quốc
        const koreanSeries = await Movie.find({
            movie_type: 'Phim bộ', // Chỉ lấy phim bộ
            release_status: 'released',
            $or: [
                { producer: /hàn quốc/i },
                { producer: /korea/i },
                { producer: /korean/i },
                { movie_title: /hàn quốc/i },
                { movie_title: /korea/i },
                { description: /hàn quốc/i },
                { description: /korea/i },
                { description: /phim hàn/i }
            ]
        })
            .select('_id movie_title poster_path producer movie_type')
            .sort({ createdAt: -1 })
            .limit(showAll ? 200 : 50);

        // Tính rating và view count
        const seriesWithStats = await Promise.all(
            koreanSeries.map(async (series) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),
                    calculateViewCount(series._id)
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    producer: series.producer,
                    movieType: series.movie_type,
                    rating: ratingData.rating,
                    viewCount: viewCount
                };
            })
        );

        // Sort theo rating và lấy limit
        const simpleKoreanSeries = seriesWithStats
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit)
            .map(series => ({
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: showAll ? "Tất cả phim bộ Hàn Quốc" : "Phim bộ Hàn Quốc",
                type: "grid",
                showAll: showAll,
                total: simpleKoreanSeries.length,
                movies: simpleKoreanSeries
            }
        });
    } catch (error) {
        console.error('Error fetching Korean series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ Hàn Quốc',
            error: error.message
        });
    }
};


// === EXPORT CÁC API ===
module.exports = {
    getBannerSeries,
    getTrendingSeries,
    getVietnameseSeries,
    getAnimeSeries,
    getKoreanSeries, 
}; 