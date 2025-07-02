const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Rating = require('../models/Rating');
const Watching = require('../models/Watching');
const mongoose = require('mongoose');

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
        
        const { updatedMovie, episodes } = await movieService.updateMovie(id, req.body);

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
const getMovieDetailWithInteractions = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // Get movie and episodes using service
        const { movie, episodes } = await movieService.getMovieById(id);

        // Calculate interactions using utility functions
        const [ratingData, viewCount, commentCount] = await Promise.all([
            calculateMovieRating(id),
            calculateViewCount(id),
            calculateCommentCount(id)
        ]);

        let movieData;
        
        if (movie.movie_type === 'Phim lẻ') {
            // Logic for single movies
            const singleEpisode = episodes[0];

            // Check rental access for paid movies
            let hasRentalAccess = movie.is_free; // Default to true for free movies
            if (!movie.is_free && userId) {
                const MovieRental = require('../models/MovieRental');
                const userRental = await MovieRental.findActiveRental(userId, id);
                hasRentalAccess = !!userRental;
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
                
                // Video information for single movies - only return URI if user has access
                uri: hasRentalAccess && singleEpisode ? singleEpisode.uri : null,
                video_url: hasRentalAccess && singleEpisode ? singleEpisode.video_url : null,
                duration: singleEpisode ? singleEpisode.duration : null,
                is_locked: !hasRentalAccess
            };

            console.log('🎬 [MovieDetail] Single movie access check:', {
                movieId: id,
                title: movie.movie_title,
                isFree: movie.is_free,
                userId: userId || 'not provided',
                hasRentalAccess,
                hasVideoUrl: !!movieData.uri || !!movieData.video_url
            });

        } else {
            // Logic for series - use schema method but override episode URIs if user has rental access
            movieData = movie.formatMovieResponse(episodes);
            
            // Check if user has rental access to override locked episodes
            let hasRentalAccess = movie.is_free; // Default to true for free movies
            if (userId && !movie.is_free) {
                const MovieRental = require('../models/MovieRental');
                const userRental = await MovieRental.findActiveRental(userId, id);
                hasRentalAccess = !!userRental;
            }
            
            // If user has rental access, show real URIs for all episodes
            if (hasRentalAccess && movieData.episodes) {
                movieData.episodes = movieData.episodes.map(ep => {
                    const fullEpisode = episodes.find(fullEp => fullEp.episode_number === ep.episode_number);
                    return {
                        ...ep,
                        uri: fullEpisode ? fullEpisode.uri : null,
                        is_locked: false
                    };
                });
            }

            console.log('🎬 [MovieDetail] Series access check:', {
                movieId: id,
                title: movie.movie_title,
                isFree: movie.is_free,
                userId: userId || 'not provided',
                hasRentalAccess,
                episodesCount: movieData.episodes?.length || 0,
                firstEpisodeUri: movieData.episodes?.[0]?.uri || 'none'
            });
        }

        // Add interaction data
        movieData.rating = ratingData.rating;
        movieData.likeCount = ratingData.likeCount;
        movieData.viewCount = viewCount;
        movieData.viewCountFormatted = formatViewCount(viewCount);
        movieData.commentCount = commentCount;

        // Check user-specific data if userId provided
        if (userId) {
            const Rating = require('../models/Rating');
            const Favorite = require('../models/Favorite');
            const Watching = require('../models/Watching');

            // Get user interactions in parallel
            const [userRating, userFavorite, userWatching, recentComments] = await Promise.all([
                // Check if user has liked/rated this movie
                Rating.findOne({ user_id: userId, movie_id: id }),
                
                // Check if movie is in user's favorites
                Favorite.findOne({ user_id: userId, movie_id: id }),
                
                // 🔧 FIX: Get user's most recent watching progress for any episode of this movie
                // Instead of just checking first episode, find the most recently watched episode
                (async () => {
                    if (episodes.length === 0) return null;
                    
                    // For single movies, check the single episode
                    if (movie.movie_type === 'Phim lẻ' && episodes[0]) {
                        return await Watching.findOne({ user_id: userId, episode_id: episodes[0]._id });
                    }
                    
                    // For series, find the most recently watched episode
                    if (episodes.length > 0) {
                        const episodeIds = episodes.map(ep => ep._id);
                        return await Watching.findOne({ 
                            user_id: userId, 
                            episode_id: { $in: episodeIds }
                        }).sort({ last_watched: -1 }); // Most recent first
                    }
                    
                    return null;
                })(),
                
                // Get recent comments for display (sorted by updatedAt for latest updates first)
                Rating.find({ 
                    movie_id: id, 
                    comment: { $exists: true, $ne: '' } 
                })
                .populate('user_id', 'name email')
                .sort({ updatedAt: -1 })
                .limit(10)
            ]);

            // Add user-specific interaction data
            movieData.userInteractions = {
                hasLiked: userRating ? userRating.is_like : false,
                hasRated: !!userRating,
                userComment: userRating && userRating.comment ? userRating.comment : null,
                isFavorite: !!userFavorite,
                isFollowing: !!userFavorite, // Same as favorite for now
                watchingProgress: userWatching ? {
                    episodeId: userWatching.episode_id,
                    // 🔧 FIX: Calculate episode number correctly from actual episode
                    episodeNumber: (() => {
                        if (movie.movie_type === 'Phim lẻ') return 1;
                        
                        // For series, find the actual episode and get its episode_number
                        const actualEpisode = episodes.find(ep => ep._id.toString() === userWatching.episode_id.toString());
                        return actualEpisode ? actualEpisode.episode_number : 1;
                    })(),
                    watchPercentage: userWatching.watch_percentage,
                    currentTime: userWatching.current_time,
                    duration: userWatching.duration, // Add duration for better progress calculation
                    lastWatched: userWatching.last_watched,
                    completed: userWatching.completed
                } : null
            };
            
            // 🔧 DEBUG: Log watching progress info
            if (userWatching) {
                console.log('🎬 [MovieDetail] User watching progress:', {
                    movieId: id,
                    movieTitle: movie.movie_title,
                    movieType: movie.movie_type,
                    watchingEpisodeId: userWatching.episode_id,
                    episodeNumber: movieData.userInteractions.watchingProgress.episodeNumber,
                    currentTime: userWatching.current_time,
                    watchPercentage: userWatching.watch_percentage,
                    lastWatched: userWatching.last_watched
                });
            }

            // Add recent comments to response
            movieData.recentComments = recentComments.map(comment => ({
                _id: comment._id,
                user: {
                    name: comment.user_id.name,
                    email: comment.user_id.email
                },
                comment: comment.comment,
                isLike: comment.is_like,
                createdAt: comment.createdAt
            }));

            // Add related movies (simple implementation - same genre)
            if (movie.genres && movie.genres.length > 0) {
                const relatedMovies = await Movie.find({
                    _id: { $ne: id }, // Exclude current movie
                    genres: { $in: movie.genres.map(g => g._id) }
                })
                .select('movie_title poster_path movie_type producer')
                .limit(5);

                movieData.relatedMovies = relatedMovies.map(relatedMovie => ({
                    movieId: relatedMovie._id,
                    title: relatedMovie.movie_title,
                    poster: relatedMovie.poster_path,
                    movieType: relatedMovie.movie_type,
                    producer: relatedMovie.producer
                }));
            }

            // Add tabs configuration for UI
            movieData.tabs = {
                showEpisodesList: movie.movie_type !== 'Phim lẻ' && episodes.length > 1,
                showRelated: movieData.relatedMovies && movieData.relatedMovies.length > 0
            };
        } else {
            // For non-authenticated users, still show recent comments (sorted by updatedAt)
            const recentComments = await Rating.find({ 
                movie_id: id, 
                comment: { $exists: true, $ne: '' } 
            })
            .populate('user_id', 'name email')
            .sort({ updatedAt: -1 })
            .limit(10);

            movieData.recentComments = recentComments.map(comment => ({
                _id: comment._id,
                user: {
                    name: comment.user_id.name,
                    email: comment.user_id.email
                },
                comment: comment.comment,
                isLike: comment.is_like,
                createdAt: comment.createdAt
            }));

            // Add related movies for non-authenticated users too
            if (movie.genres && movie.genres.length > 0) {
                const relatedMovies = await Movie.find({
                    _id: { $ne: id },
                    genres: { $in: movie.genres.map(g => g._id) }
                })
                .select('movie_title poster_path movie_type producer')
                .limit(5);

                movieData.relatedMovies = relatedMovies.map(relatedMovie => ({
                    movieId: relatedMovie._id,
                    title: relatedMovie.movie_title,
                    poster: relatedMovie.poster_path,
                    movieType: relatedMovie.movie_type,
                    producer: relatedMovie.producer
                }));
            }

            movieData.tabs = {
                showEpisodesList: movie.movie_type !== 'Phim lẻ' && episodes.length > 1,
                showRelated: movieData.relatedMovies && movieData.relatedMovies.length > 0
            };
        }

        res.json({
            status: 'success',
            data: {
                movie: movieData
            }
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
            Movie.find({ genres: { $in: genreIds } })
                .populate('genres', 'genre_name')
                .select('movie_title description poster_path genres producer price createdAt')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Movie.countDocuments({ genres: { $in: genreIds } })
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

// 🔗 API lấy linking chia sẻ phim
const getMovieLinking = async (req, res) => {
    try {
        const { id } = req.params;
        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(id).select('_id movie_title');
        if (!movie) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy phim' });
        }
        // Tạo linking (bạn thay domain theo ý muốn)
        const linking = `https://tenmiencuaban.com/movies/${movie._id}`;
        res.json({
            status: 'success',
            data: {
                movie_id: movie._id,
                movie_title: movie.movie_title,
                linking
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi server', error: error.message });
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
    getMovieLinking
};