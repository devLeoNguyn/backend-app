const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Rating = require('../models/Rating');
const Watching = require('../models/Watching');
const mongoose = require('mongoose');
const MovieRental = require('../models/MovieRental');
const PushNotificationService = require('../services/push-notification.service');

// Import movie service for centralized movie operations
const movieService = require('../services/movie.service');

// Import shared utility functions (eliminates duplication)
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount,
    calculateCommentCount,
    getMovieStatistics
} = require('../utils/movieStatsUtils');

// 📊 Lấy 5 phim mới nhất - Using Movie Service
const getNewWeekMovies = async (req, res) => {
    try {
        const moviesWithDetails = await movieService.getRecentMovies(5);

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

// 🎬 API TẠO PHIM MỚI - Refactored to use Movie Service
const createMovieController = async (req, res) => {
    try {
        // Use centralized movie service
        const { newMovie, episodes } = await movieService.createMovieComprehensive(req.body);

        // Format response using schema method
        const formattedMovie = newMovie.formatMovieResponse(episodes);

        // Add special information for sports events
        if (newMovie.movie_type === 'Thể thao') {
            formattedMovie.event_start_time = newMovie.event_start_time;
            formattedMovie.event_status = newMovie.event_status;
        }

        // Gửi push notification dựa trên 2 điều kiện:
        // 1. Phim có trạng thái "released" (auto notification)
        // 2. Admin bật flag send_notification (manual notification)
        const shouldSendNotification = newMovie.release_status === 'released' || req.body.send_notification === true;
        
        if (shouldSendNotification) {
            try {
                console.log('📢 Sending push notification for new movie:', {
                    movie_title: newMovie.movie_title,
                    release_status: newMovie.release_status,
                    send_notification: req.body.send_notification,
                    reason: newMovie.release_status === 'released' ? 'auto_released' : 'manual_admin'
                });
                
                await PushNotificationService.sendNewMovieNotification(
                    newMovie._id,
                    newMovie.movie_title,
                    newMovie.poster_path
                );
                
                console.log('✅ Push notification sent successfully');
            } catch (notificationError) {
                console.error('Error sending push notification:', notificationError);
                // Don't fail the movie creation if notification fails
            }
        } else {
            console.log('🔇 Skipping push notification for movie:', {
                movie_title: newMovie.movie_title,
                release_status: newMovie.release_status,
                send_notification: req.body.send_notification
            });
        }

        res.status(201).json({
            status: 'success',
            data: {
                movie: formattedMovie
            }
        });
    } catch (err) {
        console.error('Error in createMovie:', err);
        res.status(400).json({
            status: 'error',
            message: 'Error creating movie/sports event',
            error: err.message
        });
    }
};

// ⚽ API TẠO SỰ KIỆN THỂ THAO - Refactored to use Movie Service
const createSportsEvent = async (req, res) => {
    try {
        // Use sports event service
        const { newMovie, episodes } = await movieService.createSportsEvent(req.body);

        // Format response
        const formattedMovie = newMovie.formatMovieResponse(episodes);
        formattedMovie.event_start_time = newMovie.event_start_time;
        formattedMovie.event_status = newMovie.event_status;

        res.status(201).json({
            status: 'success',
            data: {
                sportsEvent: formattedMovie
            }
        });
    } catch (err) {
        console.error('Error creating sports event:', err);
        res.status(400).json({
            status: 'error',
            message: 'Lỗi khi tạo sự kiện thể thao',
            error: err.message
        });
    }
};

// 🎯 Lấy thông tin phim theo ID - Refactored to use Movie Service
const getMovieById = async (req, res) => {
    try {
        const { id } = req.params;

        const { movie, episodes } = await movieService.getMovieById(id);

        // Format using schema method
        const responseData = movie.formatMovieResponse(episodes);

        res.json({
            status: 'success',
            data: {
                movie: responseData
            }
        });
    } catch (err) {
        console.error('Error fetching movie:', err);
        const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
        res.status(statusCode).json({
            status: 'error',
            message: err.message
        });
    }
};

// 🔄 Cập nhật phim - Refactored to use Movie Service
const updateMovie = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Lấy thông tin phim cũ để so sánh trạng thái
        const oldMovie = await Movie.findById(id);
        if (!oldMovie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }
        
        const { updatedMovie, episodes } = await movieService.updateMovie(id, req.body);

        // Kiểm tra xem có thay đổi release_status từ 'ended' thành 'released' không
        const wasEnded = oldMovie.release_status === 'ended';
        const nowReleased = updatedMovie.release_status === 'released';
        
        if (wasEnded && nowReleased) {
            try {
                console.log('📢 Movie status changed from ended to released, sending notification:', updatedMovie.movie_title);
                await PushNotificationService.sendNewMovieNotification(
                    updatedMovie._id,
                    updatedMovie.movie_title,
                    updatedMovie.poster_path
                );
            } catch (notificationError) {
                console.error('Error sending push notification for status change:', notificationError);
                // Don't fail the update if notification fails
            }
        } else if (nowReleased && oldMovie.release_status !== 'released') {
            // Trường hợp khác: từ upcoming hoặc trạng thái khác thành released
            try {
                console.log('📢 Movie status changed to released, sending notification:', updatedMovie.movie_title);
                await PushNotificationService.sendNewMovieNotification(
                    updatedMovie._id,
                    updatedMovie.movie_title,
                    updatedMovie.poster_path
                );
            } catch (notificationError) {
                console.error('Error sending push notification for status change:', notificationError);
            }
        } else {
            console.log('🔇 No notification needed for status change:', {
                from: oldMovie.release_status,
                to: updatedMovie.release_status
            });
        }

        // Format response using schema method
        const responseData = updatedMovie.formatMovieResponse(episodes);

        res.json({
            status: 'success',
            data: {
                movie: responseData
            }
        });
    } catch (err) {
        console.error('Error updating movie:', err);
        const statusCode = err.message.includes('Không tìm thấy') ? 404 : 400;
        res.status(statusCode).json({
            status: 'error',
            message: 'Error updating movie',
            error: err.message
        });
    }
};

// 🗑️ Xóa phim - Refactored to use Movie Service
const deleteMovie = async (req, res) => {
    try {
        const { id } = req.params;

        await movieService.deleteMovie(id);

        res.json({
            status: 'success',
            message: 'Phim đã được xóa thành công'
        });
    } catch (err) {
        console.error('Error deleting movie:', err);
        const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
        res.status(statusCode).json({
            status: 'error',
            message: 'Error deleting movie',
            error: err.message
        });
    }
};

// 📊 Lấy thống kê phim
const getMovieStats = async (req, res) => {
    try {
        const { id } = req.params;

        // Use utility function for statistics
        const stats = await getMovieStatistics(id);

        res.json({
            status: 'success',
            data: stats
        });
    } catch (err) {
        console.error('Error fetching movie stats:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching movie statistics',
            error: err.message
        });
    }
};

// 🎭 Lấy chi tiết phim với tương tác - Enhanced with service patterns
// 🎭 Lấy chi tiết phim với tương tác - Full Version
const getMovieDetailWithInteractions = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // Get movie and episodes using service
        const { movie, episodes } = await movieService.getMovieById(id);

        // Calculate interactions
        const [ratingData, viewCount, commentCount] = await Promise.all([
            calculateMovieRating(id),
            calculateViewCount(id),
            calculateCommentCount(id)
        ]);

        let movieData;

        // === CASE 1: Phim lẻ ===
        if (movie.movie_type === 'Phim lẻ') {
            const singleEpisode = episodes[0];
            let hasRentalAccess = movie.is_free;
            let isRentalActive = movie.is_free;

            if (!movie.is_free && userId) {
                const userRental = await MovieRental.findOne({
                    userId,
                    movieId: id,
                    status: { $in: ['paid', 'active'] }
                });
                hasRentalAccess = !!userRental;
                isRentalActive = userRental && userRental.status === 'active';
            }

            movieData = {
                _id: movie._id,
                movie_title: movie.movie_title,
                description: movie.description,
                production_time: movie.production_time,
                producer: movie.producer,
                poster_path: movie.poster_path,
                genres: movie.genres,
                movie_type: movie.movie_type,
                price: movie.price,
                is_free: movie.is_free,
                price_display: movie.getPriceDisplay(),
                uri: isRentalActive && singleEpisode ? singleEpisode.uri : null,
                video_url: isRentalActive && singleEpisode ? singleEpisode.video_url : null,
                duration: singleEpisode ? singleEpisode.duration : null,
                is_locked: !isRentalActive
            };
        }

        // === CASE 2: Series ===
        else {
            movieData = movie.formatMovieResponse(episodes);
            let hasRentalAccess = movie.is_free;
            let isRentalActive = movie.is_free;

            if (userId && !movie.is_free) {
                const userRental = await MovieRental.findOne({
                    userId,
                    movieId: id,
                    status: { $in: ['paid', 'active'] }
                });
                hasRentalAccess = !!userRental;
                isRentalActive = userRental && userRental.status === 'active';
            }

            if (isRentalActive && movieData.episodes) {
                movieData.episodes = movieData.episodes.map(ep => {
                    const fullEpisode = episodes.find(fullEp => fullEp.episode_number === ep.episode_number);
                    return {
                        ...ep,
                        uri: fullEpisode ? fullEpisode.uri : null,
                        is_locked: false
                    };
                });
            } else if (movieData.episodes) {
                // Nếu chưa active, không trả về uri
                movieData.episodes = movieData.episodes.map(ep => ({
                  ...ep,
                  uri: null,
                  is_locked: true
                }));
            }
        }

        // === Add common interaction data ===
        movieData.rating = ratingData.rating;
        movieData.likeCount = ratingData.likeCount;
        movieData.viewCount = viewCount;
        movieData.viewCountFormatted = formatViewCount(viewCount);
        movieData.commentCount = commentCount;

        // === USER-SPECIFIC ===
        if (userId) {
            const Favorite = require('../models/Favorite');
            const Watching = require('../models/Watching');

            const [userRating, userFavorite, userWatching, recentComments] = await Promise.all([
                Rating.findOne({ user_id: userId, movie_id: id }),
                Favorite.findOne({ user_id: userId, movie_id: id }),
                (async () => {
                    if (episodes.length === 0) return null;
                    if (movie.movie_type === 'Phim lẻ' && episodes[0]) {
                        return await Watching.findOne({ user_id: userId, episode_id: episodes[0]._id });
                    }
                    const episodeIds = episodes.map(ep => ep._id);
                    return await Watching.findOne({ user_id: userId, episode_id: { $in: episodeIds } })
                        .sort({ last_watched: -1 });
                })(),
                Rating.find({ movie_id: id, comment: { $exists: true, $ne: '' } })
                    .populate('user_id', 'full_name email avatar')
                    .sort({ updatedAt: -1 })
            ]);

            movieData.userInteractions = {
                hasLiked: userRating ? userRating.is_like : false,
                hasRated: !!userRating,
                userComment: userRating?.comment || null,
                isFavorite: !!userFavorite,
                isFollowing: !!userFavorite,
                watchingProgress: userWatching ? {
                    episodeId: userWatching.episode_id,
                    episodeNumber: (() => {
                        if (movie.movie_type === 'Phim lẻ') return 1;
                        const actualEp = episodes.find(ep => ep._id.toString() === userWatching.episode_id.toString());
                        return actualEp ? actualEp.episode_number : 1;
                    })(),
                    watchPercentage: userWatching.watch_percentage,
                    currentTime: userWatching.current_time,
                    duration: userWatching.duration,
                    lastWatched: userWatching.last_watched,
                    completed: userWatching.completed
                } : null
            };

            movieData.recentComments = recentComments.map(comment => ({
                _id: comment._id,
                user: {
                    _id: comment.user_id?._id || null,
                    full_name: comment.user_id?.full_name || '',
                    email: comment.user_id?.email || '',
                    avatar: comment.user_id?.avatar || null
                },
                comment: comment.comment,
                isLike: comment.is_like,
                createdAt: comment.createdAt
            }));
        }

        // === GUEST USER ===
        else {
            const recentComments = await Rating.find({ 
                movie_id: id, 
                comment: { $exists: true, $ne: '' } 
            }).populate('user_id', 'full_name email avatar')
              .sort({ updatedAt: -1 });

            movieData.recentComments = recentComments.map(comment => ({
                _id: comment._id,
                user: {
                    _id: comment.user_id?._id || null,
                    full_name: comment.user_id?.full_name || '',
                    email: comment.user_id?.email || '',
                    avatar: comment.user_id?.avatar || null
                },
                comment: comment.comment,
                isLike: comment.is_like,
                createdAt: comment.createdAt
            }));
        }

        // === Related movies ===
        if (movie.genres && movie.genres.length > 0) {
            const relatedMovies = await Movie.find({
                _id: { $ne: id },
                genres: { $in: movie.genres.map(g => g._id) }
            }).select('movie_title poster_path movie_type producer')
              .limit(5);

            movieData.relatedMovies = relatedMovies.map(m => ({
                movieId: m._id,
                title: m.movie_title,
                poster: m.poster_path,
                movieType: m.movie_type,
                producer: m.producer
            }));
        }

        movieData.tabs = {
            showEpisodesList: movie.movie_type !== 'Phim lẻ' && episodes.length > 1,
            showRelated: movieData.relatedMovies?.length > 0
        };

        res.json({
            status: 'success',
            data: { movie: movieData }
        });
    } catch (err) {
        console.error('Error in getMovieDetailWithInteractions:', err);
        const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
        res.status(statusCode).json({
            status: 'error',
            message: 'Lỗi khi lấy chi tiết phim',
            error: err.message
        });
    }
};


// 🔍 Tìm kiếm phim - Refactored to use Movie Service
const searchMovies = async (req, res) => {
    try {
        const { q: query } = req.query;
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Query parameter "q" is required'
            });
        }

        // Use movie service for search
        const result = await movieService.searchMovies(query, req.query);

        // Format response
        const formattedMovies = result.movies.map(movie => ({
            _id: movie._id,
            movie_title: movie.movie_title,
            description: movie.description,
            production_time: movie.production_time,
            producer: movie.producer,
            movie_type: movie.movie_type,
            price: movie.price,
            is_free: movie.is_free,
            price_display: movie.price === 0 ? 'Miễn phí' : `${movie.price.toLocaleString('vi-VN')} VNĐ`,
            poster_path: movie.poster_path,
            genres: movie.genres
        }));

        res.json({
            status: 'success',
            data: {
                movies: formattedMovies,
                pagination: result.pagination
            }
        });
    } catch (error) {
        console.error('Error searching movies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tìm kiếm phim',
            error: error.message
        });
    }
};

// 🎬 Lấy danh sách phim theo thể loại
const getMoviesByGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            include_children = false, 
            page = 1, 
            limit = 10,
            sort = '-createdAt'
        } = req.query;

        // Validate genreId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: 'error',
                message: 'ID thể loại không hợp lệ'
            });
        }

        // Check if genre exists
        const genre = await Genre.findById(id);
        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        // Get all genre IDs to search for (including children if requested)
        let genreIds = [id];
        if (include_children === 'true' && genre.children && genre.children.length > 0) {
            genreIds = [...genreIds, ...genre.children];
        }

        // Calculate skip value for pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Find movies with the specified genres
        const [movies, total] = await Promise.all([
            Movie.find({ 
                genres: { $in: genreIds },
                release_status: 'released' // Chỉ hiển thị phim đã phát hành
            })
                .populate('genres', 'genre_name')
                .select('movie_title description poster_path genres producer price createdAt')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Movie.countDocuments({ 
                genres: { $in: genreIds },
                release_status: 'released' // Chỉ đếm phim đã phát hành
            })
        ]);

        // Calculate total pages
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            status: 'success',
            data: {
                movies: movies.map(movie => ({
                    _id: movie._id,
                    movie_title: movie.movie_title,
                    description: movie.description,
                    poster_path: movie.poster_path,
                    genres: movie.genres,
                    producer: movie.producer,
                    price: movie.price,
                    createdAt: movie.createdAt
                })),
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages
                }
            }
        });
    } catch (err) {
        console.error('Error fetching movies by genre:', err);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi server',
            error: err.message
        });
    }
};

// 🎽 Lấy toàn bộ phim thể thao
const getSportsMovies = async (req, res) => {
    try {
        const sportsMovies = await Movie.find({ movie_type: { $regex: /^Thể thao$/i } })
            .select('movie_title poster_path movie_type producer genres')
            .populate('genres', 'genre_name');
        res.json({
            status: 'success',
            data: sportsMovies
        });
    } catch (error) {

        res.status(500).json({
            status: 'error',
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// 🏀 Lấy danh sách phim NBA (dựa vào từ khóa 'nba')
const getNbaMovies = async (req, res) => {
    try {
        const nbaMovies = await Movie.find({
            $or: [
                { movie_title: { $regex: /nba/i } },
                { description: { $regex: /nba/i } },
                { producer: { $regex: /nba/i } }
            ]
        })
        .select('movie_title poster_path movie_type producer genres')
        .populate('genres', 'genre_name');
        res.json({ status: 'success', data: nbaMovies });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi server', error: error.message });
    }
};

// ⚽ Lấy danh sách phim bóng đá (không chứa từ nba, ưu tiên có từ bóng đá, football, soccer)
const getFootballMovies = async (req, res) => {
    try {
        const ID_GENRE_HOAT_HINH = '683d7c44d0ee4aeb15a11382';
        const footballMovies = await Movie.find({
            $and: [
                {
                    $or: [
                        { movie_title: { $regex: /bóng đá|football|soccer/i } },
                        { description: { $regex: /bóng đá|football|soccer/i } },
                        { producer: { $regex: /bóng đá|football|soccer/i } }
                    ]
                },
                { genres: { $nin: [ID_GENRE_HOAT_HINH] } }
            ]
        })
        .select('movie_title poster_path movie_type producer genres')
        .populate('genres', 'genre_name');
        res.json({ status: 'success', data: footballMovies });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi server', error: error.message });
    }
};


// 🎭 Lấy danh sách phim liên quan
const getRelatedMovies = async (req, res) => {
    try {
        const { id } = req.params;
        // Lấy phim gốc và populate đầy đủ thông tin genres
        const movie = await Movie.findById(id).populate({
            path: 'genres',
            populate: {
                path: 'parent_genre'
            }
        });

        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Lấy genreIds từ query (có thể là 1 hoặc nhiều id, phân tách bằng dấu phẩy)
        let { genreIds, useParentGenres = 'true' } = req.query;
        console.log(genreIds);
        let genresToSearch;

        if (genreIds) {
            // Nếu truyền genreIds, chuyển thành mảng ObjectId
            genresToSearch = genreIds.split(',').map(id => id.trim());
        } else {
            // Mặc định sẽ lấy thể loại cha của các thể loại của phim
            if (useParentGenres === 'true') {
                genresToSearch = movie.genres
                    .map(g => g.parent_genre ? g.parent_genre._id : g._id)
                    .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
            } else {
                genresToSearch = movie.genres.map(g => g._id);
            }
        }

        // Lấy các phim cùng thể loại, loại trừ chính nó
        const relatedMovies = await Movie.find({
            _id: { $ne: id },
            genres: { $in: genresToSearch },
            release_status: 'released' // Chỉ hiển thị phim đã phát hành
        })
        .select('movie_title poster_path movie_type producer genres')
        .limit(8)
        .populate('genres', 'genre_name parent_genre');

        res.json({
            status: 'success',
            data: relatedMovies
        });
    } catch (error) {
        console.error('Error in getRelatedMovies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi server',
        });
    }
};


// Tìm kiếm phim đã đăng kí (đã thuê) của user
const searchRegisteredMovies = async (req, res) => {
    try {
        const { userId, q } = req.query;
        if (!userId) return res.status(400).json({ status: 'error', message: 'userId là bắt buộc' });
        // Lấy tất cả rental của user, populate movieId
        const rentals = await MovieRental.find({ userId }).populate('movieId');
        // Lọc theo tên phim nếu có q
        let movies = rentals.map(r => r.movieId).filter(Boolean);
        if (q) {
            const qLower = q.toLowerCase();
            movies = movies.filter(m =>
                (m.title && m.title.toLowerCase().includes(qLower)) ||
                (m.movie_title && m.movie_title.toLowerCase().includes(qLower))
            );
        }
        res.json({ status: 'success', data: movies });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

const removeVietnameseTones = (str) => {
    return str
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

/**
 * Generate share link for a movie with deeplink support
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateShareLink = async (req, res) => {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findById(movieId);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Generate share URL with metadata and deeplink
    const shareUrl = `https://backend-app-lou3.onrender.com/movie/${movieId}`;
    
    // Create deeplink URLs for different environments
    const deeplinks = {
      expoGo: `exp://localhost:8081/--/movie/${movieId}`,
      production: `movieapp://movie/${movieId}`,
      web: shareUrl
    };
    
    res.json({
      success: true,
      data: {
        shareUrl,
        deeplinks,
        title: movie.movie_title || movie.title,
        description: movie.description,
        thumbnailUrl: movie.poster_path || movie.posterUrl,
        movieId: movie._id
      }
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getMovieRedirect = async (req, res) => {
  try {
    const { movieId } = req.params;
    const movie = await Movie.findById(movieId);
    
    if (!movie) {
      return res.status(404).render('error', {
        message: 'Movie not found',
        error: { status: 404 }
      });
    }

    // Get base URL from request or environment variable
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://backend-app-lou3.onrender.com'
      : `http://${req.get('host')}`;

    res.render('movie-redirect', { 
      movie,
      baseUrl
    });
  } catch (error) {
    console.error('Error rendering redirect page:', error);
    res.status(500).render('error', {
      message: 'Internal server error',
      error: { status: 500 }
    });
  }
};

// 🎯 MOVIE RECOMMENDATIONS - Đề xuất phim dựa trên lịch sử xem
const getMovieRecommendations = async (req, res) => {
    try {
        const { userId } = req.query;
        const limit = parseInt(req.query.limit) || 10;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'User ID là bắt buộc'
            });
        }

        console.log('🎯 [MovieRecommendations] Getting recommendations for userId:', userId);

        // 1. Lấy lịch sử xem của user
        const Watching = mongoose.model('Watching');
        const userHistory = await Watching.find({ user_id: userId })
            .populate({
                path: 'episode_id',
                populate: {
                    path: 'movie_id',
                    select: 'movie_title genres movie_type producer poster_path'
                }
            })
            .sort({ last_watched: -1 })
            .limit(50);

        if (userHistory.length === 0) {
            // Nếu user chưa có lịch sử xem, trả về phim trending
            console.log('📊 [MovieRecommendations] No user history, returning trending movies');
            const trendingMovies = await Movie.find({ release_status: 'released' })
                .populate('genres', 'genre_name')
                .sort({ view_count: -1, createdAt: -1 })
                .limit(limit)
                .select('_id movie_title poster_path movie_type producer genres');

            const recommendations = trendingMovies.map(movie => ({
                movieId: movie._id,
                title: movie.movie_title,
                poster: movie.poster_path,
                movieType: movie.movie_type,
                producer: movie.producer,
                genres: movie.genres ? movie.genres.map(g => g.genre_name) : [],
                reason: 'Phim thịnh hành'
            }));

            return res.json({
                status: 'success',
                data: {
                    recommendations,
                    total: recommendations.length,
                    reason: 'Dựa trên phim thịnh hành'
                }
            });
        }

        // 2. Phân tích thể loại phim user thích
        const genrePreferences = {};
        const movieTypePreferences = {};
        const producerPreferences = {};

        userHistory.forEach(history => {
            if (history.episode_id?.movie_id) {
                const movie = history.episode_id.movie_id;
                
                // Đếm thể loại
                if (movie.genres) {
                    movie.genres.forEach(genre => {
                        const genreName = genre.genre_name || genre;
                        genrePreferences[genreName] = (genrePreferences[genreName] || 0) + 1;
                    });
                }

                // Đếm loại phim
                if (movie.movie_type) {
                    movieTypePreferences[movie.movie_type] = (movieTypePreferences[movie.movie_type] || 0) + 1;
                }

                // Đếm nhà sản xuất
                if (movie.producer) {
                    producerPreferences[movie.producer] = (producerPreferences[movie.producer] || 0) + 1;
                }
            }
        });

        console.log('📊 [MovieRecommendations] User preferences:', {
            genres: genrePreferences,
            movieTypes: movieTypePreferences,
            producers: producerPreferences
        });

        // 3. Tìm phim tương tự dựa trên preferences
        const topGenres = Object.entries(genrePreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([genre]) => genre);

        const topMovieTypes = Object.entries(movieTypePreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([type]) => type);

        const topProducers = Object.entries(producerPreferences)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([producer]) => producer);

        // 4. Query phim dựa trên preferences
        const Movie = mongoose.model('Movie');
        const Genre = mongoose.model('Genre');

        // Lấy genre IDs từ tên
        const genreIds = [];
        if (topGenres.length > 0) {
            const genres = await Genre.find({ genre_name: { $in: topGenres } });
            genreIds.push(...genres.map(g => g._id));
        }

        // Tìm phim tương tự
        const watchedMovieIds = userHistory
            .map(h => h.episode_id?.movie_id?._id)
            .filter(Boolean);

        const similarMovies = await Movie.find({
            release_status: 'released',
            _id: { $nin: watchedMovieIds },
            $or: [
                { genres: { $in: genreIds } },
                { movie_type: { $in: topMovieTypes } },
                { producer: { $in: topProducers } }
            ]
        })
        .populate('genres', 'genre_name')
        .sort({ view_count: -1, createdAt: -1 })
        .limit(limit * 2); // Lấy nhiều hơn để filter

        // 5. Tính điểm recommendation cho từng phim
        const scoredMovies = similarMovies.map(movie => {
            let score = 0;
            let reasons = [];

            // Điểm cho genre match
            if (movie.genres) {
                const movieGenres = movie.genres.map(g => g.genre_name || g);
                const genreMatches = movieGenres.filter(g => topGenres.includes(g));
                if (genreMatches.length > 0) {
                    score += genreMatches.length * 10;
                    reasons.push(`Thể loại: ${genreMatches.join(', ')}`);
                }
            }

            // Điểm cho movie type match
            if (topMovieTypes.includes(movie.movie_type)) {
                score += 5;
                reasons.push(`Loại phim: ${movie.movie_type}`);
            }

            // Điểm cho producer match
            if (topProducers.includes(movie.producer)) {
                score += 3;
                reasons.push(`Nhà sản xuất: ${movie.producer}`);
            }

            // Điểm cho view count
            score += Math.min(movie.view_count || 0, 100) / 10;

            return {
                movie,
                score,
                reasons
            };
        });

        // 6. Sort theo điểm và lấy top recommendations
        let recommendations = [];
        
        if (scoredMovies.length > 0) {
            recommendations = scoredMovies
                .sort((a, b) => b.score - a.score)
                .slice(0, limit)
                .map(({ movie, reasons }) => ({
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    movieType: movie.movie_type,
                    producer: movie.producer,
                    genres: movie.genres ? movie.genres.map(g => g.genre_name || g) : [],
                    reason: reasons.length > 0 ? reasons[0] : 'Phim tương tự'
                }));
        } else {
            // Fallback: lấy phim trending nếu không có phim tương tự
            console.log('📊 [MovieRecommendations] No similar movies found, returning trending movies');
            const trendingMovies = await Movie.find({ 
                release_status: 'released',
                _id: { $nin: watchedMovieIds }
            })
            .populate('genres', 'genre_name')
            .sort({ view_count: -1, createdAt: -1 })
            .limit(limit)
            .select('_id movie_title poster_path movie_type producer genres');

            recommendations = trendingMovies.map(movie => ({
                movieId: movie._id,
                title: movie.movie_title,
                poster: movie.poster_path,
                movieType: movie.movie_type,
                producer: movie.producer,
                genres: movie.genres ? movie.genres.map(g => g.genre_name) : [],
                reason: 'Phim thịnh hành'
            }));
        }

        console.log('✅ [MovieRecommendations] Generated recommendations:', {
            total: recommendations.length,
            topGenres,
            topMovieTypes,
            topProducers
        });

        res.json({
            status: 'success',
            data: {
                recommendations,
                total: recommendations.length,
                reason: 'Dựa trên lịch sử xem của bạn',
                preferences: {
                    topGenres,
                    topMovieTypes,
                    topProducers
                }
            }
        });

    } catch (error) {
        console.error('❌ [MovieRecommendations] Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo đề xuất phim',
            error: error.message
        });
    }
};

// Export all controller functions
module.exports = {
    getNewWeekMovies,
    createMovieController,
    createSportsEvent,
    getMovieById,
    updateMovie,
    deleteMovie,
    getMovieStats,
    getMovieDetailWithInteractions,
    searchMovies,
    getMoviesByGenre,

    getSportsMovies,
    getNbaMovies,
    getFootballMovies,
    getRelatedMovies,
    searchRegisteredMovies,
    generateShareLink,
    getMovieRedirect,
    getMovieRecommendations
};