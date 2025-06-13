const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');


// Helper: Lấy danh sách phim (không cần nhiều hơn 1 tập)
async function getSeriesBaseQuery(filter = {}) {
    const movies = await Movie.find(filter)
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

// Trending: dựa vào view_count và favorite_count
exports.getTrendingSeries = async (req, res) => {
    try {
        let series = await getSeriesBaseQuery({ movie_type: { $ne: 'Thể thao' } });
        series = series.sort((a, b) => (b.view_count + b.favorite_count) - (a.view_count + a.favorite_count)).slice(0, 10);
        res.status(200).json({ success: true, data: series });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// Hành động: genres có chứa "Hành động" hoặc "Action"
exports.getActionSeries = async (req, res) => {
    try {
        // Lấy tất cả phim không phải thể thao
        let series = await getSeriesBaseQuery({ movie_type: { $ne: 'Thể thao' } });
        series = series.filter(m => m.genres.some(g => (g.genre_name || '').toLowerCase().includes('action') || (g.genre_name || '').toLowerCase().includes('hành động')));
        res.status(200).json({ success: true, data: series });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// Việt Nam: lọc theo genre_name hoặc các trường khác chứa 'việt'
exports.getVietnameseSeries = async (req, res) => {
    try {
        // Lấy tất cả phim không phải thể thao
        const movies = await Movie.find({ movie_type: { $ne: 'Thể thao' } })
            .populate('genres', 'genre_name')
            .lean();
        // Lọc phim có genre_name, producer, description, movie_title, country chứa 'việt'
        const data = movies.filter(m =>
            (m.genres && m.genres.some(g => (g.genre_name || '').toLowerCase().includes('việt')))
            || (m.producer && m.producer.toLowerCase().includes('việt'))
            || (m.description && m.description.toLowerCase().includes('việt'))
            || (m.movie_title && m.movie_title.toLowerCase().includes('việt'))
            || (m.country && m.country.toLowerCase().includes('việt'))
        ).map(m => ({
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
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// Anime: genres có genre_name chứa 'anime' hoặc 'hoạt hình'
exports.getAnimeSeries = async (req, res) => {
    try {
        let series = await getSeriesBaseQuery();
        series = series.filter(m =>
            m.genres.some(g => (g.genre_name || '').toLowerCase().includes('anime') || (g.genre_name || '').toLowerCase().includes('hoạt hình'))
        );
        res.status(200).json({ success: true, data: series });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// Lấy chi tiết phim theo id
exports.getSeriesById = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
            .populate('genres', 'genre_name description')
            .lean();
        if (!movie) {
            return res.status(404).json({ success: false, error: 'Series not found' });
        }
        // Lấy danh sách tập phim
        const episodes = await Episode.find({ movie_id: movie._id })
            .select('episode_title uri episode_number episode_description duration')
            .sort({ episode_number: 1 });
        res.status(200).json({
            success: true,
            data: {
                _id: movie._id,
                movie_title: movie.movie_title,
                description: movie.description,
                poster_path: movie.poster_path,
                genres: movie.genres,
                country: movie.country || null,
                total_episodes: episodes.length || 1,
                view_count: movie.view_count || 0,
                favorite_count: movie.favorite_count || 0,
                release_status: movie.release_status || null,
                price: movie.price || 0,
                is_free: movie.is_free || false,
                createdAt: movie.createdAt,
                updatedAt: movie.updatedAt,
                episodes: episodes
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * Lấy dữ liệu banner và phim đề xuất
 * API này trả về 2 phần:
 * 1. Banner: Danh sách phim mới nhất để hiển thị banner
 * 2. Recommended: Danh sách phim đề xuất để hiển thị dạng lưới
 * 
 * @route GET /api/series/banner
 * @query {number} bannerLimit - Số lượng phim trong banner (mặc định: 5)
 * @query {number} limit - Số lượng phim đề xuất (mặc định: 6)
 * @query {number} days - Số ngày gần đây để lấy phim mới (mặc định: 30)
 * 
 * @returns {Object} JSON response
 * @returns {boolean} success - Trạng thái thành công hay thất bại
 * @returns {Object} data - Dữ liệu banner và đề xuất
 * @returns {Object} data.banner - Thông tin banner
 * @returns {Object} data.recommended - Thông tin phim đề xuất
 */
exports.getBannerSeries = async (req, res) => {
    try {
        // Lấy các tham số từ query, nếu không có thì dùng giá trị mặc định
        const bannerLimit = parseInt(req.query.bannerLimit) || 5;  // Số phim trong banner
        const gridLimit = parseInt(req.query.limit) || 6;          // Số phim đề xuất
        const days = parseInt(req.query.days) || 30;               // Số ngày gần đây

        // Tính thời điểm bắt đầu (days ngày trước)
        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Tìm các phim mới được thêm vào trong khoảng thời gian
        const newReleases = await Movie.find({
            release_status: 'released',  // Chỉ lấy phim đã phát hành
            createdAt: { $gte: fromDate } // Tạo trong khoảng thời gian
        })
            .populate('genres', 'genre_name')  // Lấy thông tin thể loại
            .select('movie_title poster_path description production_time movie_type producer genres createdAt')
            .sort({ createdAt: -1 })  // Sắp xếp mới nhất lên đầu
            .limit(bannerLimit + gridLimit)  // Lấy đủ số lượng cho cả banner và grid
            .lean();  // Chuyển sang plain object để tối ưu performance

        // Xử lý dữ liệu cho banner
        const bannerMovies = newReleases.slice(0, bannerLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title || '',
            poster: movie.poster_path || '',
            description: movie.description || '',
            releaseYear: (movie.production_time && !isNaN(Date.parse(movie.production_time)))
                ? new Date(movie.production_time).getFullYear()
                : null,
            movieType: movie.movie_type || '',
            producer: movie.producer || '',
            genres: Array.isArray(movie.genres)
                ? movie.genres.slice(0, 3).map(g => g.genre_name || '')  // Chỉ lấy 3 thể loại đầu
                : []
        }));

        // Xử lý dữ liệu cho grid đề xuất
        const gridMovies = newReleases.slice(0, gridLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title || '',
            poster: movie.poster_path || '',
            movieType: movie.movie_type || '',
            producer: movie.producer || ''
        }));

        // Trả về response thành công
        res.status(200).json({
            success: true,
            data: {
                banner: {
                    title: "Phim mới ra mắt",
                    type: "banner_list",
                    movies: bannerMovies
                },
                recommended: {
                    title: "Phim dành cho bạn",
                    type: "grid",
                    movies: gridMovies
                }
            }
        });
    } catch (error) {
        // Log lỗi để debug
        console.error('Lỗi banner:', error.message);
        
        // Trả về lỗi 500 nếu có vấn đề
        res.status(500).json({
            success: false,
            message: 'Không thể lấy dữ liệu banner',
            error: error.message
        });
    }
};

// Tab chọn thể loại quốc gia
exports.getCountryTabs = async (req, res) => {
    try {
        const countries = await Country.find({ is_active: true })
            .sort({ sort_order: 1 })
            .select('code name')
            .lean();

        return res.json({
            success: true,
            data: countries.map(country => ({
                id: country.code,
                name: country.name
            }))
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({
            success: false,
            error: 'Không thể lấy danh sách quốc gia'
        });
    }
};

exports.getBannerFullSeries = async (req, res) => {
    try {
        const bannerLimit = parseInt(req.query.bannerLimit) || 5;
        const gridLimit = parseInt(req.query.limit) || 6;
        // KHÔNG lọc release_status, KHÔNG loại trừ thể thao, chỉ lấy mới nhất
        const newReleases = await Movie.find({})
            .populate('genres', 'genre_name')
            .sort({ createdAt: -1 })
            .limit(bannerLimit + gridLimit)
            .lean();

        // List phim cho banner section
        const bannerMovies = newReleases.slice(0, bannerLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title || '',
            poster: movie.poster_path || '',
            description: movie.description || '',
            releaseYear: movie.production_time ? new Date(movie.production_time).getFullYear() : null,
            movieType: movie.movie_type || '',
            producer: movie.producer || '',
            genres: Array.isArray(movie.genres) ? movie.genres.slice(0, 3).map(g => g.genre_name || '') : []
        }));

        // List phim cho grid "Phim dành cho bạn"
        const gridMovies = newReleases.slice(0, gridLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title || '',
            poster: movie.poster_path || '',
            movieType: movie.movie_type || '',
            producer: movie.producer || ''
        }));

        res.status(200).json({
            success: true,
            data: {
                banner: {
                    title: "Phim mới ra mắt",
                    type: "banner_list",
                    movies: bannerMovies
                },
                recommended: {
                    title: "Phim dành cho bạn",
                    type: "grid",
                    movies: gridMovies
                }
            }
        });
    } catch (error) {
        console.error('Banner full error:', error);
        res.status(200).json({
            success: true,
            data: {
                banner: { title: "Phim mới ra mắt", type: "banner_list", movies: [] },
                recommended: { title: "Phim dành cho bạn", type: "grid", movies: [] }
            }
        });
    }
}; 