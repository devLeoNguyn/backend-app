const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Rating = require('../models/Rating');
const Watching = require('../models/Watching');
const mongoose = require('mongoose');
const { validatePrice, validateEpisodes, determineMovieType, validateMovieData } = require('../validators/movieValidator');

// Helper functions for stats calculation
const calculateMovieRating = async (movieId) => {
    try {
        const ratingStats = await Rating.aggregate([
            { $match: { movie_id: mongoose.Types.ObjectId(movieId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    likes: { $sum: { $cond: [{ $eq: ['$is_like', true] }, 1, 0] } }
                }
            }
        ]);

        if (!ratingStats.length) return { rating: 0, likeCount: 0, totalRatings: 0 };
        const { total, likes } = ratingStats[0];
        return {
            rating: Number(((likes / total) * 10).toFixed(1)),
            likeCount: likes,
            totalRatings: total
        };
    } catch (error) {
        console.error('Error calculating rating:', error);
        return { rating: 0, likeCount: 0, totalRatings: 0 };
    }
};

const calculateViewCount = async (movieId) => {
    try {
        const episodes = await Episode.find({ movie_id: movieId }).select('_id');
        const episodeIds = episodes.map(ep => ep._id);

        const viewCount = await Watching.countDocuments({
            episode_id: { $in: episodeIds },
            completed: true
        });

        return viewCount;
    } catch (error) {
        console.error('Error calculating view count:', error);
        return 0;
    }
};

const formatViewCount = (count) => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(0) + 'k';
    }
    return count.toString();
};

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

// Thêm phim mới (bao gồm sự kiện thể thao)
const createMovieController = async (req, res) => {
    try {
        // Comprehensive validation cho tất cả movie types
        const validatedData = validateMovieData(req.body);

        // Extract validated fields
        const {
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type,
            poster_path,
            genres = [],
            event_start_time,
            event_status,
            maxEpisodeNumber
        } = validatedData;

        const validGenres = await Genre.find({ _id: { $in: genres } });
        if (validGenres.length !== genres.length) {
            return res.status(400).json({
                status: 'error',
                message: 'Một hoặc nhiều thể loại không tồn tại'
            });
        }
        // Tạo movie object với các trường cần thiết
        const movieData = {
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type,
            genres,
            total_episodes: maxEpisodeNumber,
            poster_path: poster_path || '',
            genres: genres || []
        };

        // Thêm trường đặc biệt cho sports events
        if (movie_type === 'Thể thao') {
            movieData.event_start_time = event_start_time;
            movieData.event_status = event_status;
        }

        // Tạo movie
        const newMovie = await Movie.create(movieData);

        // Tạo episodes
        const episodes = await Promise.all(req.body.episodes.map(async (ep, index) => {
            return await Episode.create({
                episode_title: ep.episode_title,
                uri: ep.uri,
                episode_number: movie_type === 'Thể thao' ? 1 : ep.episode_number,
                episode_description: ep.episode_description || '',
                duration: ep.duration || 0,
                movie_id: newMovie._id
            });
        }));

        // Populate genres information
        await newMovie.populate('genres', 'genre_name description');

        // Format response using schema method
        const formattedMovie = newMovie.formatMovieResponse(episodes);

        // Thêm thông tin sports event vào response nếu cần
        if (movie_type === 'Thể thao') {
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

// Tạo sự kiện thể thao mới (dedicated function)
const createSportsEvent = async (req, res) => {
    try {
        // Đảm bảo movie_type là 'Thể thao'
        const sportsData = {
            ...req.body,
            movie_type: 'Thể thao'
        };

        // Validate sports event data
        const validatedData = validateMovieData(sportsData);

        // Extract fields
        const {
            movie_title,
            description,
            production_time,
            producer,
            price,
            poster_path,
            genres,
            event_start_time,
            event_status
        } = validatedData;

        // Tạo sports event
        const newSportsEvent = await Movie.create({
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type: 'Thể thao',
            total_episodes: 1,
            poster_path: poster_path || '',
            genres: genres || [],
            event_start_time,
            event_status
        });

        // Tạo episode duy nhất cho sự kiện thể thao
        const episode = await Episode.create({
            episode_title: req.body.episodes[0].episode_title || movie_title,
            uri: req.body.episodes[0].uri,
            episode_number: 1,
            episode_description: req.body.episodes[0].episode_description || description,
            duration: req.body.episodes[0].duration || 0,
            movie_id: newSportsEvent._id
        });

        // Populate genres
        await newSportsEvent.populate('genres', 'genre_name description');

        // Format response
        const formattedEvent = newSportsEvent.formatMovieResponse([episode]);
        formattedEvent.event_start_time = newSportsEvent.event_start_time;
        formattedEvent.event_status = newSportsEvent.event_status;

        res.status(201).json({
            status: 'success',
            message: 'Sports event created successfully',
            data: {
                sports_event: formattedEvent
            }
        });
    } catch (err) {
        console.error('Error creating sports event:', err);
        res.status(400).json({
            status: 'error',
            message: 'Error creating sports event',
            error: err.message
        });
    }
};

// Lấy chi tiết phim
const getMovieById = async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id)
            .populate('genres', 'genre_name description');

        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Movie not found'
            });
        }

        // Lấy thông tin episodes
        const episodes = await Episode.find({ movie_id: movie._id })
            .select('episode_title uri episode_number episode_description duration')
            .sort({ episode_number: 1 });

        const responseData = movie.formatMovieResponse(episodes);

        res.json({
            status: 'success',
            data: {
                movie: responseData
            }
        });
    } catch (err) {
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

// Get movie stats (likes, views, comments count)
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

        // Get all stats
        const [ratingData, viewCount, commentCount] = await Promise.all([
            calculateMovieRating(movie_id),
            calculateViewCount(movie_id),
            Rating.countDocuments({ 
                movie_id, 
                comment: { $exists: true, $ne: '' } 
            })
        ]);

        res.json({
            status: 'success',
            data: {
                movieId: movie_id,
                likes: ratingData.likeCount,
                rating: ratingData.rating,
                views: viewCount,
                viewsFormatted: formatViewCount(viewCount),
                comments: commentCount,
                totalRatings: ratingData.totalRatings
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
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
    getMovieStats
};