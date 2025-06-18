const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Rating = require('../models/Rating');
const Watching = require('../models/Watching');
const mongoose = require('mongoose');
const { validatePrice, validateEpisodes, determineMovieType, validateMovieData } = require('../validators/movieValidator');

// Import shared utility functions (eliminates duplication)
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount,
    calculateCommentCount,
    getMovieStatistics
} = require('../utils/movieStatsUtils');

// Lấy 5 phim mới nhất
const getNewWeekMovies = async (req, res) => {
    try {
        const recentMovies = await Movie.find()
            .select('movie_title description production_time producer movie_type price is_free price_display')
            .sort({ production_time: -1 })
            .limit(5);

        // Xử lý từng phim và kiểm tra số tập
        const moviesWithDetails = await Promise.all(recentMovies.map(async (movie) => {
            const episodes = await Episode.find({ movie_id: movie._id })
                .select('episode_title uri episode_number episode_description')
                .sort({ episode_number: 1 });

            return movie.formatMovieResponse(episodes);
        }));

        res.json({
            status: 'success',
            data: {
                movies: moviesWithDetails,
                total: moviesWithDetails.length
            }
        });
    } catch (err) {
        console.error('Error fetching recent movies:', err);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server Error',
            error: err.message
        });
    }
};

// 🎬 API TẠO PHIM MỚI (HỖ TRỢ TẤT CẢ LOẠI PHIM)
// @route POST /api/movies
// @description Tạo phim mới bao gồm: Phim lẻ, Phim bộ, Sự kiện thể thao
// Mục đích: API tổng quát để tạo mọi loại phim với episodes tương ứng
// Logic hoạt động:
// 1. 🔍 Validate dữ liệu đầu vào theo từng loại phim
// 2. ✅ Kiểm tra tính hợp lệ của genres
// 3. 🎬 Tạo Movie record trong database
// 4. 📺 Tạo Episodes tương ứng (1 tập cho phim lẻ, nhiều tập cho phim bộ)
// 5. 🎨 Format response theo chuẩn frontend
// 6. ⚙️ Xử lý đặc biệt cho sự kiện thể thao
const createMovieController = async (req, res) => {
    try {
        // 🔍 1. VALIDATION TOÀN DIỆN CHO TẤT CẢ LOẠI PHIM
        const validatedData = validateMovieData(req.body);

        // 📊 2. EXTRACT CÁC TRƯỜNG DỮ LIỆU ĐÃ VALIDATE
        const {
            movie_title,           // 🎬 Tên phim
            description,           // 📝 Mô tả phim  
            production_time,       // 📅 Thời gian sản xuất
            producer,             // 🏭 Nhà sản xuất
            price,                // 💰 Giá phim
            movie_type,           // 🎭 Loại phim: 'Phim lẻ', 'Phim bộ', 'Thể thao'
            poster_path,          // 🖼️ Đường dẫn poster
            genres = [],          // 🏷️ Danh sách thể loại
            event_start_time,     // ⏰ Thời gian bắt đầu (chỉ cho thể thao)
            event_status,         // 📊 Trạng thái sự kiện (chỉ cho thể thao)
            maxEpisodeNumber      // 📺 Tổng số tập (quan trọng cho phim bộ)
        } = validatedData;

        // ✅ 3. KIỂM TRA TÍNH HỢP LỆ CỦA GENRES
        const validGenres = await Genre.find({ _id: { $in: genres } });
        if (validGenres.length !== genres.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Một hoặc nhiều thể loại không tồn tại'
            });
        }
        
        // 🎬 4. TẠO MOVIE OBJECT VỚI CÁC TRƯỜNG CẦN THIẾT
        const movieData = {
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type,           // 🔑 Trường quan trọng để phân biệt loại phim
            genres,
            total_episodes: maxEpisodeNumber,  // 📺 Số tập: 1 cho phim lẻ, >1 cho phim bộ
            poster_path: poster_path || '',
            genres: genres || []
        };

        // ⚙️ 5. XỬ LÝ ĐặC BIỆT CHO SỰ KIỆN THỂ THAO
        if (movie_type === 'Thể thao') {
            movieData.event_start_time = event_start_time;  // ⏰ Thời gian bắt đầu
            movieData.event_status = event_status;          // 📊 Trạng thái sự kiện
        }

        // 🎬 6. TẠO MOVIE RECORD TRONG DATABASE
        const newMovie = await Movie.create(movieData);

        // 📺 7. TẠO EPISODES TƯƠNG ỨNG
        // Logic khác nhau cho từng loại phim:
        // - Phim lẻ: 1 episode duy nhất 
        // - Phim bộ: Nhiều episodes theo maxEpisodeNumber
        // - Thể thao: 1 episode với episode_number = 1
        const episodes = await Promise.all(req.body.episodes.map(async (ep, index) => {
            return await Episode.create({
                episode_title: ep.episode_title,
                uri: ep.uri,
                // 🔢 Logic số tập: Thể thao luôn là 1, các loại khác theo input
                episode_number: movie_type === 'Thể thao' ? 1 : ep.episode_number,
                episode_description: ep.episode_description || '',
                duration: ep.duration || 0,                    // ⏱️ Thời lượng tập
                movie_id: newMovie._id                         // 🔗 Liên kết với movie
            });
        }));

        // 🏷️ 8. POPULATE THÔNG TIN GENRES
        await newMovie.populate('genres', 'genre_name description');

        // 🎨 9. FORMAT RESPONSE SỬ DỤNG SCHEMA METHOD
        // Schema method sẽ format khác nhau cho phim lẻ vs phim bộ
        const formattedMovie = newMovie.formatMovieResponse(episodes);

        // ⚙️ 10. THÊM THÔNG TIN ĐặC BIỆT CHO SỰ KIỆN THỂ THAO
        if (movie_type === 'Thể thao') {
            formattedMovie.event_start_time = newMovie.event_start_time;
            formattedMovie.event_status = newMovie.event_status;
        }

        // 📤 11. TRẢ VỀ KẾT QUẢ THÀNH CÔNG
        res.status(201).json({
            status: 'success',
            data: {
                movie: formattedMovie
            }
        });
    } catch (err) {
        // 🚨 XỬ LÝ LỖI VÀ LOGGING
        console.error('Error in createMovie:', err);
        res.status(400).json({
            status: 'error',
            message: 'Error creating movie/sports event',
            error: err.message
        });
    }
};

/**
 * ⚽ API TẠO SỰ KIỆN THỂ THAO CHUYÊN DỤNG
 * 
 * @route POST /api/movies/sports
 * @description Tạo sự kiện thể thao với cấu hình đặc biệt
 * 
 * Mục đích: API chuyên dụng cho sự kiện thể thao, đảm bảo movie_type = 'Thể thao'
 * 
 * Logic hoạt động:
 * 1. 🔒 Force movie_type = 'Thể thao'
 * 2. 📺 Tạo chỉ 1 episode duy nhất (episode_number = 1)
 * 3. ⏰ Bắt buộc có event_start_time và event_status
 * 4. 🎨 Format response với thông tin sự kiện
 */
const createSportsEvent = async (req, res) => {
    try {
        // 🔒 1. ĐẢM BẢO MOVIE_TYPE LÀ 'THỂ THAO'
        const sportsData = {
            ...req.body,
            movie_type: 'Thể thao'  // 🔑 Force movie type
        };

        // 🔍 2. VALIDATE DỮ LIỆU SỰ KIỆN THỂ THAO
        const validatedData = validateMovieData(sportsData);

        // 📊 3. EXTRACT CÁC TRƯỜNG DỮ LIỆU
        const {
            movie_title,
            description,
            production_time,
            producer,
            price,
            poster_path,
            genres,
            event_start_time,     // ⏰ Bắt buộc cho sự kiện thể thao
            event_status          // 📊 Trạng thái sự kiện
        } = validatedData;

        // ⚽ 4. TẠO SỰ KIỆN THỂ THAO
        const newSportsEvent = await Movie.create({
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type: 'Thể thao',     // 🔑 Loại phim cố định
            total_episodes: 1,          // 📺 Luôn là 1 tập
            poster_path: poster_path || '',
            genres: genres || [],
            event_start_time,           // ⏰ Thời gian bắt đầu
            event_status               // 📊 Trạng thái
        });

        // 📺 5. TẠO EPISODE DUY NHẤT CHO SỰ KIỆN THỂ THAO
        const episode = await Episode.create({
            episode_title: req.body.episodes[0].episode_title || movie_title,  // 🎬 Tên tập = tên sự kiện
            uri: req.body.episodes[0].uri,                                    // 🔗 Link video
            episode_number: 1,                                                // 📺 Luôn là tập 1
            episode_description: req.body.episodes[0].episode_description || description,
            duration: req.body.episodes[0].duration || 0,                    // ⏱️ Thời lượng
            movie_id: newSportsEvent._id                                      // 🔗 Liên kết
        });

        // 🏷️ 6. POPULATE GENRES
        await newSportsEvent.populate('genres', 'genre_name description');

        // 🎨 7. FORMAT RESPONSE CHO SỰ KIỆN THỂ THAO
        const formattedEvent = newSportsEvent.formatMovieResponse([episode]);
        formattedEvent.event_start_time = newSportsEvent.event_start_time;    // ⏰ Thêm info đặc biệt
        formattedEvent.event_status = newSportsEvent.event_status;            // 📊 Thêm trạng thái

        // 📤 8. TRẢ VỀ KẾT QUẢ
        res.status(201).json({
            status: 'success',
            message: 'Sports event created successfully',
            data: {
                sports_event: formattedEvent  // 🏷️ Key đặc biệt cho sự kiện thể thao
            }
        });
    } catch (err) {
        // 🚨 XỬ LÝ LỖI
        console.error('Error creating sports event:', err);
        res.status(400).json({
            status: 'error',
            message: 'Error creating sports event',
            error: err.message
        });
    }
};

/**
 * 📽️ API LẤY CHI TIẾT PHIM THEO ID
 * 
 * @route GET /api/movies/:id
 * @description Lấy thông tin đầy đủ của phim bao gồm episodes
 * 
 * Logic hoạt động:
 * 1. 🔍 Tìm movie theo ID và populate genres
 * 2. 📺 Lấy tất cả episodes của phim
 * 3. 🎨 Format response sử dụng schema method
 * 4. 📊 Trả về thông tin phù hợp với từng loại phim
 */
const getMovieById = async (req, res) => {
    try {
        // 🔍 1. TÌM PHIM THEO ID VÀ POPULATE GENRES
        const movie = await Movie.findById(req.params.id)
            .populate('genres', 'genre_name description');

        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Movie not found'
            });
        }

        // 📺 2. LẤY TẤT CẢ EPISODES CỦA PHIM
        // Sắp xếp theo episode_number để đảm bảo thứ tự đúng cho phim bộ
        const episodes = await Episode.find({ movie_id: movie._id })
            .select('episode_title uri episode_number episode_description duration')  // 📋 Field cần thiết
            .sort({ episode_number: 1 });                                           // 📊 Tập 1, 2, 3...

        // 🎨 3. FORMAT RESPONSE SỬ DỤNG SCHEMA METHOD
        // Schema method sẽ xử lý khác nhau cho:
        // - Phim lẻ: Trả về thông tin cơ bản + URI tập duy nhất
        // - Phim bộ: Trả về danh sách đầy đủ episodes
        // - Thể thao: Trả về thông tin sự kiện + episode stream
        const responseData = movie.formatMovieResponse(episodes);

        // 📤 4. TRẢ VỀ KẾT QUẢ
        res.json({
            status: 'success',
            data: {
                movie: responseData
            }
        });
    } catch (err) {
        // 🚨 XỬ LÝ LỖI
        res.status(500).json({
            status: 'error',
            message: 'Error fetching movie',
            error: err.message
        });
    }
};

// Cập nhật phim
const updateMovie = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra phim tồn tại
        const existingMovie = await Movie.findById(id);
        if (!existingMovie) {
            return res.status(404).json({
                status: 'error',
                message: 'Movie not found'
            });
        }

        // Cập nhật thông tin cơ bản của phim
        const updatedMovie = await Movie.findByIdAndUpdate(
            id,
            {
                movie_title: updateData.movie_title,
                description: updateData.description,
                production_time: updateData.production_time,
                producer: updateData.producer,
                price: updateData.price,
                poster_path: updateData.poster_path,
                genres: updateData.genres
            },
            { new: true, runValidators: true }
        ).populate('genres', 'genre_name description');

        // Cập nhật hoặc thêm mới các tập phim
        if (updateData.episodes && updateData.episodes.length > 0) {
            // Xóa các tập cũ
            await Episode.deleteMany({ movie_id: id });

            // Thêm các tập mới
            const episodes = await Promise.all(updateData.episodes.map(async (ep) => {
                return await Episode.create({
                    episode_title: ep.episode_title,
                    uri: ep.uri,
                    episode_number: ep.episode_number,
                    episode_description: ep.episode_description || '',
                    duration: ep.duration,
                    movie_id: id
                });
            }));

            // Format response using schema method
            const responseData = updatedMovie.formatMovieResponse(episodes);

            res.json({
                status: 'success',
                data: {
                    movie: responseData
                }
            });
        } else {
            // Get existing episodes if no new episodes provided
            const episodes = await Episode.find({ movie_id: id })
                .select('episode_title uri episode_number episode_description')
                .sort({ episode_number: 1 });

            const responseData = updatedMovie.formatMovieResponse(episodes);

            res.json({
                status: 'success',
                data: {
                    movie: responseData
                }
            });
        }

    } catch (err) {
        res.status(400).json({
            status: 'error',
            message: 'Error updating movie',
            error: err.message
        });
    }
};

// Xóa phim
const deleteMovie = async (req, res) => {
    try {
        const movie = await Movie.findByIdAndDelete(req.params.id);

        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Movie not found'
            });
        }

        // Xóa tất cả episodes của phim
        await Episode.deleteMany({ movie_id: req.params.id });

        res.json({
            status: 'success',
            message: 'Movie and its episodes deleted successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'Error deleting movie',
            error: err.message
        });
    }
};

// UNIFIED: Get movie stats using shared utils (eliminates duplication)
const getMovieStats = async (req, res) => {
    try {
        const { movie_id } = req.params;

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Use shared utility function for comprehensive stats
        const stats = await getMovieStatistics(movie_id);

        res.json({
            status: 'success',
            data: {
                movieId: movie_id,
                ...stats
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
//HOME DETAIL--------------------------------

// 🆕 API Tổng hợp chi tiết phim cho màn hình detail
const getMovieDetailWithInteractions = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query; // Optional userId for interactions

        // Lấy thông tin phim cơ bản
        const movie = await Movie.findById(id)
            .populate('genres', 'genre_name description');

        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Lấy thông tin episodes
        const episodes = await Episode.find({ movie_id: id })
            .select('episode_title uri episode_number episode_description duration')
            .sort({ episode_number: 1 });

        // Lấy thống kê phim (views, likes, ratings)
        const [ratingData, viewCount, commentCount] = await Promise.all([
            calculateMovieRating(id),
            calculateViewCount(id),
            Rating.countDocuments({ 
                movie_id: id, 
                comment: { $exists: true, $ne: '' } 
            })
        ]);

        // Lấy bình luận gần đây (5 bình luận mới nhất)
        const recentComments = await Rating.find({ 
            movie_id: id, 
            comment: { $exists: true, $ne: '' } 
        })
        .populate('user_id', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(5);

        // Nếu có user, lấy trạng thái tương tác của user
        let userInteractions = null;
        if (userId) {
            const [userRating, userFavorite, userWatching] = await Promise.all([
                Rating.findOne({ user_id: userId, movie_id: id }),
                require('../models/Favorite').findOne({ user_id: userId, movie_id: id }),
                Watching.findOne({ user_id: userId, episode_id: { $in: episodes.map(ep => ep._id) } })
                    .populate('episode_id', 'episode_number')
                    .sort({ last_watched: -1 })
            ]);

            userInteractions = {
                hasLiked: userRating?.is_like || false,
                hasRated: !!userRating,
                userComment: userRating?.comment || null,
                isFavorite: !!userFavorite,
                isFollowing: !!userFavorite, // Assuming favorite = following
                watchingProgress: userWatching ? {
                    episodeNumber: userWatching.episode_id?.episode_number,
                    watchPercentage: userWatching.watch_percentage,
                    currentTime: userWatching.current_time,
                    lastWatched: userWatching.last_watched
                } : null
            };
        }

        // Lấy phim liên quan (cùng thể loại, khác phim hiện tại)
        const relatedMovies = await Movie.find({
            _id: { $ne: id },
            genres: { $in: movie.genres }
        })
        .select('movie_title poster_path movie_type producer')
        .limit(10)
        .sort({ createdAt: -1 });

        // 🎬 FORMAT RESPONSE KHÁC NHAU CHO TỪNG LOẠI PHIM
        let movieData = {};
        
        if (movie.movie_type === 'Phim lẻ') {
            // 🎭 LOGIC CHO PHIM LẺ: Chỉ có 1 tập duy nhất
            // Trả về thông tin cơ bản + URI để có thể play ngay
            const singleEpisode = episodes[0];
            movieData = {
                _id: movie._id,
                movie_title: movie.movie_title,
                description: movie.description,
                production_time: movie.production_time,
                producer: movie.producer,
                poster_path: movie.poster_path,
                genres: movie.genres,
                movie_type: movie.movie_type,                    // 🔑 'Phim lẻ'
                price: movie.price,
                is_free: movie.is_free,
                price_display: movie.getPriceDisplay(),
                
                // 🎥 THÔNG TIN VIDEO CHO PHIM LẺ (QUAN TRỌNG)
                uri: movie.is_free && singleEpisode ? singleEpisode.uri : null,  // 🔗 Link video nếu free
                duration: singleEpisode ? singleEpisode.duration : null,         // ⏱️ Thời lượng phim
                is_locked: !movie.is_free                                        // 🔒 Có bị khóa không?
            };
        } else {
            // 📺 LOGIC CHO PHIM BỘ: Có nhiều tập
            // Sử dụng schema method để format đầy đủ danh sách episodes
            movieData = movie.formatMovieResponse(episodes);
            
            // Schema method sẽ trả về:
            // - Thông tin cơ bản của phim
            // - Danh sách đầy đủ episodes với episode_number, title, uri
            // - total_episodes
            // - current_episode (nếu có)
        }
        
        const responseData = {
            // Thông tin phim
            movie: {
                ...movieData,
                cast: [], // TODO: Thêm model Cast nếu cần
                crew: [], // TODO: Thêm model Crew nếu cần
            },
            
            // Thống kê và tương tác
            stats: {
                views: viewCount,
                viewsFormatted: formatViewCount(viewCount),
                likes: ratingData.likeCount,
                rating: ratingData.rating,
                totalRatings: ratingData.totalRatings,
                comments: commentCount
            },

            // Bình luận gần đây
            recentComments: recentComments.map(comment => ({
                _id: comment._id,
                user: {
                    name: comment.user_id.name,
                    email: comment.user_id.email
                },
                comment: comment.comment,
                isLike: comment.is_like,
                createdAt: comment.createdAt
            })),

            // Trạng thái tương tác của user (nếu đăng nhập)
            userInteractions,

            // Phim liên quan (cho tab "Liên quan")
            relatedMovies: relatedMovies.map(relMovie => ({
                movieId: relMovie._id,
                title: relMovie.movie_title,
                poster: relMovie.poster_path,
                movieType: relMovie.movie_type,
                producer: relMovie.producer
            })),

            // 🎛️ UI CONFIG CHO TABS (QUAN TRỌNG CHO FRONTEND)
            tabs: {
                showEpisodesList: movie.movie_type === 'Phim bộ',  // 📺 Chỉ show tab "Danh sách" cho phim bộ
                                                                   //     Phim lẻ không cần tab này vì chỉ có 1 tập
                showRelated: true                                  // 🔗 Luôn show tab "Liên quan" cho mọi loại phim
            }
        };

        res.json({
            status: 'success',
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching movie detail with interactions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy chi tiết phim',
            error: error.message
        });
    }
};

/**
 * 🔍 API TÌM KIẾM PHIM ĐƠN GIẢN
 * 
 * Mục đích: Tìm kiếm phim theo tên và mô tả với pagination cho FlatList
 * 
 * Input Parameters:
 * - tuKhoa: Từ khóa tìm kiếm (chỉ tìm trong title và description)
 * - page: Trang hiện tại (pagination)
 * - limit: Số phim mỗi trang
 * 
 * Output: Array phim + pagination info + search info
 */
const searchMovies = async (req, res) => {
  try {
    // 📥 1. LẤY VÀ VALIDATE INPUT PARAMETERS
    const {
      tuKhoa,     // Từ khóa tìm kiếm (chỉ tên phim và mô tả)
      page = 1,   // Trang hiện tại (mặc định: 1)
      limit = 20  // Số phim mỗi trang (mặc định: 20)
    } = req.query;

    // 🔧 2. XÂY DỰNG ĐIỀU KIỆN TÌM KIẾM ĐƠN GIẢN (MongoDB Query)
    const dieuKien = {};

    // 🔤 Tìm kiếm theo từ khóa - CHỈ trong title và description
    if (tuKhoa && tuKhoa.trim()) {
      dieuKien.$or = [
        { movie_title: { $regex: tuKhoa.trim(), $options: 'i' } },    // Tìm trong tên phim
        { description: { $regex: tuKhoa.trim(), $options: 'i' } }     // Tìm trong mô tả
      ];
      // Regex với option 'i' = case insensitive (không phân biệt hoa thường)
    }

    // 📊 3. TÍNH TOÁN PAGINATION
    const pageNum = parseInt(page) || 1;        // Đảm bảo page là số, mặc định 1
    const limitNum = parseInt(limit) || 20;     // Đảm bảo limit là số, mặc định 20
    const skip = (pageNum - 1) * limitNum;      // Tính số record cần bỏ qua

    // 🔢 Đếm tổng số phim thỏa mãn điều kiện (cho pagination)
    const totalMovies = await Movie.countDocuments(dieuKien);
    const totalPages = Math.ceil(totalMovies / limitNum);

    // 🔍 4. XÂY DỰNG QUERY VỚI PAGINATION
    let query = Movie.find(dieuKien)
      .select('movie_title description production_time producer movie_type price is_free price_display poster_path genres view_count favorite_count')
      .populate('genres', 'genre_name description')  // Join với Genre collection
      .skip(skip)       // Bỏ qua N record đầu
      .limit(limitNum)  // Lấy tối đa limitNum record
      .sort({ createdAt: -1 }); // Mặc định: sắp xếp theo ngày tạo mới nhất

    // 🚀 5. THỰC THI QUERY VÀ LẤY DỮ LIỆU
    const movies = await query.exec();

    // 🎨 6. PROCESSING DATA - Format cho Frontend FlatList
    const moviesWithStats = await Promise.all(
      movies.map(async (movie) => {
        // 📺 LẤY THÔNG TIN TẬP PHIM (QUAN TRỌNG CHO PHIM BỘ)
        // Chỉ lấy thông tin cơ bản để tính total_episodes
        const episodes = await Episode.find({ movie_id: movie._id })
          .select('episode_title episode_number')   // 📋 Chỉ cần title và number
          .sort({ episode_number: 1 });            // 📊 Sắp xếp theo thứ tự tập

        // ⭐ TÍNH TOÁN RATING TỪ RATING COLLECTION
        const ratingData = await calculateMovieRating(movie._id);
        
        // 📦 FORMAT DỮ LIỆU ĐƠN GIẢN - TỐI ƯU CHO FLATLIST
        return {
          // 🆔 THÔNG TIN CƠ BẢN
          movieId: movie._id,
          title: movie.movie_title,
          poster: movie.poster_path || null,
          movieType: movie.movie_type,              // 🔑 'Phim lẻ', 'Phim bộ', 'Thể thao'
          producer: movie.producer,
          
          // 📝 THÔNG TIN MÔ TẢ (RÚT GỌN CHO UI)
          description: movie.description ? movie.description.substring(0, 100) + '...' : null,
          releaseYear: movie.production_time ? new Date(movie.production_time).getFullYear() : null,
          
          // 💵 THÔNG TIN GIÁ CẢ
          price: movie.price,
          is_free: movie.is_free,
          price_display: movie.is_free ? 'Miễn phí' : `${movie.price.toLocaleString('vi-VN')} VNĐ`,
          
          // 📈 THỐNG KÊ ENGAGEMENT
          view_count: movie.view_count || 0,
          favorite_count: movie.favorite_count || 0,
          rating: ratingData.rating || 0,
          total_ratings: ratingData.totalRatings || 0,
          
          // 🎬 THÔNG TIN TẬP PHIM (QUAN TRỌNG)
          // - Phim lẻ: episodes.length = 1
          // - Phim bộ: episodes.length = số tập thực tế
          // - Thể thao: episodes.length = 1
          total_episodes: episodes.length,
          
          // 🏷️ THỂ LOẠI (GIỚI HẠN 3 ĐỂ UI KHÔNG QUÁ DÀI)
          genres: movie.genres ? movie.genres.slice(0, 3).map(g => g.genre_name) : []
        };
      })
    );

    // 📤 7. TRẢ VỀ KẾT QUẢ ĐƠN GIẢN
    res.json({
      status: 'success',
      data: {
        // 🎬 Danh sách phim đã format
        movies: moviesWithStats,
        
        // 📄 Thông tin phân trang (cho infinite scroll)
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: totalMovies,
          items_per_page: limitNum,
          has_next: pageNum < totalPages,    // Còn trang tiếp theo không?
          has_prev: pageNum > 1              // Có trang trước không?
        },
        
        // 🔍 Thông tin tìm kiếm đã áp dụng (để frontend track)
        search_info: {
          keyword: tuKhoa || null,
          search_in: ['movie_title', 'description'], // Chỉ tìm trong 2 field này
          total_found: totalMovies
        }
      }
    });
  } catch (err) {
    // 🚨 XỬ LÝ LỖI VÀ LOGGING
    console.error('Lỗi khi tìm kiếm phim:', err);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server khi tìm kiếm',
      error: err.message
    });
  }
};

module.exports = {
    getNewWeekMovies,
    createMovieController,
    createSportsEvent,
    getMovieById,
    updateMovie,
    deleteMovie,
    getMovieStats,
    searchMovies,
    getMovieDetailWithInteractions
};