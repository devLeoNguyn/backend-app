const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');

// Import shared utility functions từ home controller
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount
} = require('../utils/movieStatsUtils');

/**
 * 🎬 HELPER FUNCTION: LẤY DANH SÁCH PHIM BỘ CƠ BẢN
 * 
 * Mục đích: Tạo query cơ bản để lấy phim bộ với các filter tùy chọn
 * 
 * @param {Object} filter - Điều kiện lọc thêm (ngoài movie_type = 'Phim bộ')
 * @returns {Array} Danh sách phim bộ đã được format chuẩn
 * 
 * Logic:
 * 1. 🔍 Luôn filter movie_type = 'Phim bộ' 
 * 2. 📊 Populate thông tin genres
 * 3. 🎨 Format data chuẩn cho response
 * 4. ⚡ Sử dụng lean() cho performance
 */
async function getSeriesBaseQuery(filter = {}) {
    // 🔧 Merge filter với điều kiện bắt buộc: chỉ lấy phim bộ
    const seriesFilter = { ...filter, movie_type: 'Phim bộ' };
    
    // 📋 Query database với populate genres
    const movies = await Movie.find(seriesFilter)
        .populate('genres', 'genre_name')  // 🏷️ Lấy tên thể loại
        .lean();                          // ⚡ Tối ưu performance
    
    // 🎨 Format dữ liệu chuẩn cho tất cả API
    return movies.map(m => ({
        _id: m._id,
        movie_title: m.movie_title,
        description: m.description,
        poster_path: m.poster_path,
        genres: m.genres,
        country: m.country || null,
        total_episodes: m.total_episodes || 1,     // 📺 Số tập phim bộ
        view_count: m.view_count || 0,             // 👀 Lượt xem
        favorite_count: m.favorite_count || 0,     // ❤️ Lượt yêu thích
        release_status: m.release_status || null,   // 🚀 Trạng thái phát hành
        price: m.price || 0,                       // 💰 Giá phim
        is_free: m.is_free || false,               // 🆓 Miễn phí hay không
        createdAt: m.createdAt,                    // 📅 Ngày tạo
        updatedAt: m.updatedAt                     // 🔄 Ngày cập nhật
    }));
}

// === 🎬 API CHO MÀN HÌNH PHIM BỘ ===

/**
 * 1. 🎬 API BANNER CHO MÀN HÌNH PHIM BỘ
 * 
 * @route GET /api/series/banner-series
 * @query {number} bannerLimit - Số phim cho banner (mặc định: 5)
 * @query {number} limit - Số phim cho grid đề xuất (mặc định: 6) 
 * @query {number} days - Lấy phim trong N ngày gần đây (mặc định: 30)
 * 
 * Mục đích: Tạo banner và grid đề xuất cho trang chủ phim bộ
 * 
 * Logic hoạt động:
 * 1. 📅 Tính toán thời gian từ N ngày trước đến hiện tại
 * 2. 🔍 Query phim bộ mới nhất trong khoảng thời gian đó
 * 3. 🎯 Lọc chỉ phim đã release (release_status = 'released')
 * 4. 📊 Populate thông tin genres để hiển thị
 * 5. 🎨 Format dữ liệu cho banner (với mô tả đầy đủ)
 * 6. 🎨 Format dữ liệu cho grid (chỉ thông tin cơ bản)
 * 7. 📤 Trả về 2 sections: banner + recommended
 */
const getBannerSeries = async (req, res) => {
    try {
        // 📊 1. PARSE CÁC THAM SỐ VÀ THIẾT LẬP MẶC ĐỊNH
        const showAll = req.query.showAll === 'true';
        const bannerLimit = parseInt(req.query.bannerLimit) || (showAll ? 20 : 5);    // 🎬 Số phim banner
        const gridLimit = parseInt(req.query.limit) || (showAll ? 80 : 6);            // 📱 Số phim grid
        const days = parseInt(req.query.days) || 30;                 // 📅 Ngày gần đây

        // ⏰ 2. TÍNH TOÁN THỜI GIAN BẮT ĐẦU (N ngày trước)
        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // 🔍 3. QUERY PHIM BỘ MỚI NHẤT
        const newSeries = await Movie.find({
            movie_type: 'Phim bộ',              // ✅ Chỉ lấy phim bộ
            release_status: 'released',          // ✅ Đã phát hành
            createdAt: { $gte: fromDate }        // ✅ Trong N ngày gần đây
        })
            .populate('genres', 'genre_name')    // 🏷️ Lấy tên thể loại
            .select('movie_title poster_path description production_time movie_type producer genres createdAt')
            .sort({ createdAt: -1 })             // 📅 Mới nhất trước
            .limit(bannerLimit + gridLimit)      // 🔢 Lấy đủ cho cả banner + grid
            .lean();                             // ⚡ Tối ưu performance

        // 🎨 4. XỬ LÝ DỮ LIỆU CHO BANNER SECTION
        // Banner cần thông tin đầy đủ hơn (có description, năm phát hành, genres)
        const bannerSeries = newSeries.slice(0, bannerLimit).map(series => ({
            movieId: series._id,
            title: series.movie_title || '',
            poster: series.poster_path || '',
            description: series.description || '',                    // 📝 Mô tả đầy đủ
            releaseYear: (series.production_time && !isNaN(Date.parse(series.production_time)))
                ? new Date(series.production_time).getFullYear()       // 📅 Năm phát hành
                : null,
            movieType: series.movie_type || '',                       // 🎬 Loại phim
            producer: series.producer || '',                          // 🏭 Nhà sản xuất
            genres: Array.isArray(series.genres)
                ? series.genres.slice(0, 3).map(g => g.genre_name || '')  // 🏷️ Tối đa 3 thể loại
                : []
        }));

        // 🎨 5. XỬ LÝ DỮ LIỆU CHO GRID SECTION
        // Grid chỉ cần thông tin cơ bản để hiển thị trong lưới
        const gridSeries = newSeries.slice(0, gridLimit).map(series => ({
            movieId: series._id,
            title: series.movie_title || '',
            poster: series.poster_path || '',
            movieType: series.movie_type || '',
            producer: series.producer || ''
        }));

        // 📤 6. TRẢ VỀ KẾT QUẢ VỚI 2 SECTIONS
        res.json({
            status: 'success',
            data: {
                // 🎬 Banner section - Hiển thị dạng slider với thông tin đầy đủ
                banner: {
                    title: "Phim bộ mới ra mắt",
                    type: "banner_list",
                    movies: bannerSeries
                },
                // 📱 Recommended section - Hiển thị dạng grid
                recommended: {
                    title: "Phim bộ dành cho bạn", 
                    type: "grid",
                    movies: gridSeries
                }
            }
        });
    } catch (error) {
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
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
 * 
 * @route GET /api/series/trending
 * @query {boolean} showAll - true để xem tất cả, false chỉ lấy top (mặc định: false)
 * 
 * Mục đích: Lấy danh sách phim bộ đang thịnh hành dựa trên lượt xem
 * 
 * Logic hoạt động:
 * 1. 🔍 Query tất cả phim bộ đã release
 * 2. 📊 Tính view count từ bảng WatchHistory cho từng phim
 * 3. ⭐ Tính rating từ bảng Rating cho từng phim  
 * 4. 📈 Sắp xếp theo view count giảm dần
 * 5. 🔢 Lấy top N phim (8 nếu không showAll, nhiều hơn nếu showAll)
 * 6. 🎨 Format response đơn giản cho frontend
 */
const getTrendingSeries = async (req, res) => {
    try {
        // 📊 1. PARSE THAM SỐ VÀ THIẾT LẬP LIMIT
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8; // 🔢 Nếu showAll thì lấy nhiều, không thì chỉ 8

        // 🔍 2. QUERY PHIM BỘ CƠ BẢN
        // Lấy phim bộ để tính view count - giới hạn query để tối ưu performance
        const allSeries = await Movie.find({ 
            movie_type: 'Phim bộ',              // ✅ Chỉ phim bộ
            release_status: 'released'           // ✅ Đã phát hành
        })
            .select('_id movie_title poster_path movie_type producer')  // 📋 Chỉ lấy field cần thiết
            .limit(showAll ? 400 : 50);         // 🔢 Tăng giới hạn khi showAll

        // 📊 3. TÍNH TOÁN STATS CHO TỪNG PHIM BỘ
        // Chạy song song để tối ưu performance
        const seriesWithStats = await Promise.all(
            allSeries.map(async (series) => {
                // 🚀 Chạy song song 2 tính toán: rating và view count
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(series._id),    // ⭐ Tính rating từ bảng Rating
                    calculateViewCount(series._id)       // 👀 Tính view count từ WatchHistory
                ]);

                return {
                    movieId: series._id,
                    title: series.movie_title,
                    poster: series.poster_path,
                    movieType: series.movie_type,
                    producer: series.producer,
                    viewCount                            // 📈 View count để sort
                };
            })
        );

        // 📈 4. SẮP XẾP THEO VIEW COUNT VÀ LẤY TOP
        const trendingSeries = seriesWithStats
            .sort((a, b) => b.viewCount - a.viewCount)   // 📈 View count cao nhất trước
            .slice(0, limit)                             // 🔢 Lấy top N
            .map(series => ({
                // 🎨 Format response đơn giản (bỏ viewCount internal)
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
                title: showAll ? "Tất cả phim bộ thịnh hành" : "Phim bộ đang thịnh hành",
                type: "grid",
                showAll: showAll,                        // 🔄 Để frontend biết trạng thái
                total: trendingSeries.length,            // 📊 Tổng số phim trả về
                movies: trendingSeries
            }
        });
    } catch (error) {
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
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
 * 
 * @route GET /api/series/vietnamese
 * @query {boolean} showAll - true để xem tất cả, false chỉ lấy top (mặc định: false)
 * 
 * Mục đích: Lấy danh sách phim bộ Việt Nam dựa trên nhiều tiêu chí tìm kiếm
 * 
 * Logic hoạt động:
 * 1. 🔍 Tìm kiếm phim bộ có liên quan đến Việt Nam qua nhiều field
 * 2. 📊 Tính rating và view count cho từng phim
 * 3. ⭐ Sắp xếp theo rating giảm dần (khác với trending)
 * 4. 🔢 Lấy top N phim theo limit
 * 5. 🎨 Format response cho frontend
 */
const getVietnameseSeries = async (req, res) => {
    try {
        // 📊 1. PARSE THAM SỐ VÀ THIẾT LẬP LIMIT
        const showAll = req.query.showAll === 'true';
        const limit = showAll ? 1000 : 8;

        // 🔍 2. TÌM PHIM BỘ VIỆT NAM
        // Sử dụng $or để tìm kiếm linh hoạt trong nhiều field
        const vietnamSeries = await Movie.find({
            movie_type: 'Phim bộ',               // ✅ Chỉ lấy phim bộ
            release_status: 'released',           // ✅ Đã phát hành
            $or: [
                // 🏭 Tìm trong producer (nhà sản xuất)
                { producer: /việt nam/i },
                { producer: /vietnam/i },
                
                // 🎬 Tìm trong tên phim
                { movie_title: /việt/i },
                { movie_title: /vietnam/i },
                
                // 📝 Tìm trong mô tả
                { description: /việt nam/i },
                { description: /vietnam/i },
                { description: /phim việt/i }
            ]
        })
            .select('_id movie_title poster_path producer movie_type')  // 📋 Chỉ lấy field cần thiết
            .sort({ createdAt: -1 })             // 📅 Mới nhất trước
            .limit(showAll ? 200 : 50);          // 🔢 Giới hạn query

        // 📊 3. TÍNH TOÁN RATING VÀ VIEW COUNT
        const seriesWithStats = await Promise.all(
            vietnamSeries.map(async (series) => {
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

        // ⭐ 4. SẮP XẾP THEO RATING (KHÁC VỚI TRENDING)
        // Phim Việt ưu tiên chất lượng (rating) hơn là popularity (view count)
        const simpleVietnameseSeries = seriesWithStats
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
                title: showAll ? "Tất cả phim bộ Việt Nam" : "Phim bộ Việt Nam",
                type: "grid",
                showAll: showAll,
                total: simpleVietnameseSeries.length,
                movies: simpleVietnameseSeries
            }
        });
    } catch (error) {
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
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
        const limit = showAll ? 1000 : 8;

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
        const limit = showAll ? 1000 : 8;

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


// === 📤 EXPORT CÁC API CHO ROUTER ===
module.exports = {
    getBannerSeries,        // 🎬 Banner phim bộ cho trang chủ
    getTrendingSeries,      // 🔥 Phim bộ thịnh hành
    getVietnameseSeries,    // 🇻🇳 Phim bộ Việt Nam
    getAnimeSeries,         // 🌸 Phim bộ Anime 
    getKoreanSeries,        // 🇰🇷 Phim bộ Hàn Quốc
}; 