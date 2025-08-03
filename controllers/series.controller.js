const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');

// Import movie service for centralized operations
const movieService = require('../services/movie.service');

// Import shared utility functions từ home controller
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount
} = require('../utils/movieStatsUtils');

/**
 * 🎬 HELPER FUNCTION: LẤY DANH SÁCH PHIM BỘ CƠ BẢN
 * Enhanced to use Movie Service patterns
 */
async function getSeriesBaseQuery(filter = {}) {
    // Merge filter với điều kiện bắt buộc: chỉ lấy phim bộ đã phát hành
    const seriesFilter = { 
        ...filter, 
        movie_type: 'Phim bộ',
        release_status: 'released' // Chỉ hiển thị phim đã phát hành
    };
    
    // Query database với populate genres
    const movies = await Movie.find(seriesFilter)
        .populate('genres', 'genre_name')
        .lean();
    
    // Format dữ liệu chuẩn cho tất cả API
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

// === 🎬 API CHO MÀN HÌNH PHIM BỘ ===

/**
 * 1. 🎬 API BANNER CHO MÀN HÌNH PHIM BỘ
 * Enhanced with Movie Service patterns
 */
const getBannerSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const bannerLimit = parseInt(req.query.bannerLimit) || (showAll ? 20 : 5);
        const gridLimit = parseInt(req.query.limit) || (showAll ? 20 : 6);
        const days = parseInt(req.query.days) || 90;

        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Use optimized query for series
        const newSeries = await Movie.find({
            movie_type: 'Phim bộ',
            release_status: 'released',
            createdAt: { $gte: fromDate }
        })
            .populate('genres', 'genre_name')
            .select('movie_title poster_path description production_time movie_type producer genres createdAt')
            .sort({ createdAt: -1 })
            .limit(bannerLimit + gridLimit)
            .lean();

        // Process banner series with enhanced formatting
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

        // Process grid series
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
 * 2. 🔥 API PHIM BỘ THỊNH HÀNH (TRENDING)
 * Enhanced with utility functions
 */
const getTrendingSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = parseInt(req.query.limit) || (showAll ? 20 : 8);

        // Query series với tối ưu performance
        const allSeries = await Movie.find({ 
            movie_type: 'Phim bộ',
            release_status: 'released'
        })
            .select('_id movie_title poster_path movie_type producer')
            .limit(showAll ? 400 : 50);

        // Tính toán stats cho từng phim bộ using utility functions
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

        // Sort and format response
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
 * 3. 🇻🇳 API PHIM BỘ VIỆT NAM  
 * Enhanced with Movie Service search patterns
 */
const getVietnameseSeries = async (req, res) => {
    try {
        const showAll = req.query.showAll === 'true';
        const limit = parseInt(req.query.limit) || (showAll ? 20 : 8);

        // Use Movie Service search patterns for Vietnamese content
        const searchOptions = {
            page: 1,
            limit: limit * 2, // Get more to filter
            movie_type: 'Phim bộ'
        };

        // Search for Vietnamese series using enhanced query
        const vietnameseQuery = {
            movie_type: 'Phim bộ',
            $or: [
                { producer: { $regex: /việt nam|vietnam|vn/i } },
                { description: { $regex: /việt nam|vietnam|phim việt/i } },
                { movie_title: { $regex: /việt nam|vietnam/i } }
            ]
        };

        const vietnameseSeries = await Movie.find(vietnameseQuery)
            .populate('genres', 'genre_name')
            .select('_id movie_title poster_path movie_type producer description genres')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Format response
        const formattedSeries = vietnameseSeries.map(series => ({
            movieId: series._id,
            title: series.movie_title,
            poster: series.poster_path,
            movieType: series.movie_type,
            producer: series.producer,
            description: series.description,
            genres: series.genres ? series.genres.slice(0, 3).map(g => g.genre_name) : []
        }));

        res.json({
            status: 'success',
            data: {
                title: showAll ? "Tất cả phim bộ Việt Nam" : "Phim bộ Việt Nam",
                type: "grid",
                showAll: showAll,
                total: formattedSeries.length,
                movies: formattedSeries
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
 * 4. 🌸 API PHIM BỘ ANIME
 * 
 * @route GET /api/series/anime
 * @query {boolean} showAll - true để xem tất cả, false chỉ lấy top (mặc định: false)
 * 
 * Mục đích: Lấy danh sách phim bộ anime/hoạt hình
 * 
 * Logic hoạt động:
 * 1. 🔍 Tìm genre "Hoạt hình" trong database
 * 2. 📋 Query phim bộ thuộc genre đó
 * 3. 📊 Tính rating và view count
 * 4. 🔥 Sắp xếp theo view count (anime ưu tiên popularity)
 * 5. 🎨 Format response
 */
const getAnimeSeries = async (req, res) => {
    try {
        // 📊 1. PARSE THAM SỐ VÀ THIẾT LẬP LIMIT
        const showAll = req.query.showAll === 'true';
        const limit = parseInt(req.query.limit) || (showAll ? 20 : 8);

        // 🔍 2. TÌM GENRE ANIME/HOẠT HÌNH
        const animeGenre = await Genre.findOne({ genre_name: /hoạt hình/i });
        let animeSeries = [];

        // 📋 3. QUERY PHIM BỘ ANIME (NẾU TÌM ĐƯỢC GENRE)
        if (animeGenre) {
            animeSeries = await Movie.find({ 
                movie_type: 'Phim bộ',              // ✅ Chỉ phim bộ
                genres: animeGenre._id,             // ✅ Thuộc genre hoạt hình
                release_status: 'released'           // ✅ Đã phát hành
            })
                .select('_id movie_title poster_path movie_type producer')  // 📋 Field cần thiết
                .sort({ createdAt: -1 })             // 📅 Mới nhất trước
                .limit(showAll ? 200 : 50);          // 🔢 Giới hạn query
        }

        // 📊 4. TÍNH TOÁN RATING VÀ VIEW COUNT
        const animeWithStats = await Promise.all(
            animeSeries.map(async (series) => {
                // 🚀 Chạy song song để tối ưu performance
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),    // ⭐ Tính rating
                    calculateViewCount(series._id)       // 👀 Tính view count
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    movieType: series.movie_type,
                    producer: series.producer,
                    rating: ratingData.rating,
                    viewCount: viewCount                 // 🔥 View count để sort
                };
            })
        );

        // 🔥 5. SẮP XẾP THEO POPULARITY (VIEW COUNT)
        // Anime thường ưu tiên độ phổ biến hơn là rating
        const simpleAnimeSeries = animeWithStats
            .sort((a, b) => b.viewCount - a.viewCount)   // 🔥 View count cao nhất trước
            .slice(0, limit)                             // 🔢 Lấy top N
            .map(series => ({
                // 🎨 Format response đơn giản
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        // 📤 6. TRẢ VỀ KẾT QUẢ
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
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
        console.error('Error fetching anime series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ anime',
            error: error.message
        });
    }
};

/**
 * 5. 🇰🇷 API PHIM BỘ HÀN QUỐC (K-DRAMA)
 * 
 * @route GET /api/series/korean  
 * @query {boolean} showAll - true để xem tất cả, false chỉ lấy top (mặc định: false)
 * 
 * Mục đích: Lấy danh sách phim bộ Hàn Quốc dựa trên nhiều tiêu chí tìm kiếm
 * 
 * Logic hoạt động:
 * 1. 🔍 Tìm kiếm phim bộ có liên quan đến Hàn Quốc qua nhiều field
 * 2. 📊 Tính rating và view count cho từng phim
 * 3. ⭐ Sắp xếp theo rating (K-Drama ưu tiên chất lượng)
 * 4. 🔢 Lấy top N phim theo limit
 * 5. 🎨 Format response cho frontend
 */
const getKoreanSeries = async (req, res) => {
    try {
        // 📊 1. PARSE THAM SỐ VÀ THIẾT LẬP LIMIT
        const showAll = req.query.showAll === 'true';
        const limit = parseInt(req.query.limit) || (showAll ? 20 : 8);

        // 🔍 2. TÌM PHIM BỘ HÀN QUỐC  
        // Sử dụng $or để tìm kiếm linh hoạt trong nhiều field
        const koreanSeries = await Movie.find({
            movie_type: 'Phim bộ',               // ✅ Chỉ lấy phim bộ
            release_status: 'released',           // ✅ Đã phát hành
            $or: [
                // 🏭 Tìm trong producer (nhà sản xuất)
                { producer: /hàn quốc/i },
                { producer: /korea/i },
                { producer: /korean/i },
                
                // 🎬 Tìm trong tên phim
                { movie_title: /hàn quốc/i },
                { movie_title: /korea/i },
                
                // 📝 Tìm trong mô tả
                { description: /hàn quốc/i },
                { description: /korea/i },
                { description: /phim hàn/i }
            ]
        })
            .select('_id movie_title poster_path producer movie_type')  // 📋 Chỉ lấy field cần thiết
            .sort({ createdAt: -1 })             // 📅 Mới nhất trước
            .limit(showAll ? 200 : 50);          // 🔢 Giới hạn query

        // 📊 3. TÍNH TOÁN RATING VÀ VIEW COUNT
        const seriesWithStats = await Promise.all(
            koreanSeries.map(async (series) => {
                // 🚀 Chạy song song để tối ưu performance
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),    // ⭐ Tính rating
                    calculateViewCount(series._id)       // 👀 Tính view count
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    producer: series.producer,
                    movieType: series.movie_type,
                    rating: ratingData.rating,           // ⭐ Rating để sort
                    viewCount: viewCount
                };
            })
        );

        // ⭐ 4. SẮP XẾP THEO RATING
        // K-Drama thường ưu tiên chất lượng (rating) hơn là popularity
        const simpleKoreanSeries = seriesWithStats
            .sort((a, b) => b.rating - a.rating)         // ⭐ Rating cao nhất trước  
            .slice(0, limit)                             // 🔢 Lấy top N
            .map(series => ({
                // 🎨 Format response đơn giản
                movieId: series.movieId,
                title: series.title,
                poster: series.poster,
                movieType: series.movieType,
                producer: series.producer
            }));

        // 📤 5. TRẢ VỀ KẾT QUẢ
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
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
        console.error('Error fetching Korean series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim bộ Hàn Quốc',
            error: error.message
        });
    }
};

// === EXPORTS ===
module.exports = {
    getBannerSeries,
    getTrendingSeries,
    getVietnameseSeries,
    getSeriesBaseQuery, // Export helper for other controllers
    getAnimeSeries,
    getKoreanSeries
}; 