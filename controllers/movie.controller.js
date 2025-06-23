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
                
                // Video information for single movies
                uri: movie.is_free && singleEpisode ? singleEpisode.uri : null,
                duration: singleEpisode ? singleEpisode.duration : null,
                is_locked: !movie.is_free
            };
        } else {
            // Logic for series - use schema method but override episode URIs if user has rental access
            movieData = movie.formatMovieResponse(episodes);
            
            // Check if user has rental access to override locked episodes
            if (userId && !movie.is_free) {
                const MovieRental = require('../models/MovieRental');
                const userRental = await MovieRental.findActiveRental(userId, id);
                
                // If user has active rental, show real URIs
                if (userRental && movieData.episodes) {
                    movieData.episodes = movieData.episodes.map(ep => {
                        const fullEpisode = episodes.find(fullEp => fullEp.episode_number === ep.episode_number);
                        return {
                            ...ep,
                            uri: fullEpisode ? fullEpisode.uri : null,
                            is_locked: false
                        };
                    });
                }
            }
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
                
                // Get user's watching progress (for first episode if series, or single episode if movie)
                movie.movie_type === 'Phim lẻ' && episodes[0] ? 
                    Watching.findOne({ user_id: userId, episode_id: episodes[0]._id }) :
                    episodes.length > 0 ? 
                        Watching.findOne({ user_id: userId, episode_id: episodes[0]._id }) : 
                        null,
                
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
                    episodeNumber: movie.movie_type === 'Phim lẻ' ? 1 : episodes.findIndex(ep => ep._id.toString() === userWatching.episode_id.toString()) + 1,
                    watchPercentage: userWatching.watch_percentage,
                    currentTime: userWatching.current_time,
                    lastWatched: userWatching.last_watched,
                    completed: userWatching.completed
                } : null
            };

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
    searchMovies
};