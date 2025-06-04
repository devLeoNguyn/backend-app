const Movie = require('../models/Movie');
const Genre = require('../models/Genre');
const Watching = require('../models/Watching');
const Episode = require('../models/Episode');
const Rating = require('../models/Rating');
const mongoose = require('mongoose');

// ==============================================
// HELPER FUNCTIONS - Dễ hiểu cho sinh viên
// ==============================================

// Tính rating từ Rating model (% like -> thang điểm 10)
const calculateMovieRating = async (movieId) => {
    try {
        const ratingStats = await Rating.aggregate([
            { $match: { movie_id: new mongoose.Types.ObjectId(movieId) } },
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

// Tính view count từ Watching model (đếm completed views)
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

// Format view count cho UI (214k, 1.2M, etc.)
const formatViewCount = (count) => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(0) + 'k';
    }
    return count.toString();
};

// ==============================================
// API CONTROLLERS - Từng section riêng biệt
// ==============================================

// 1. 🆕 New Releases - Banner List + Phim dành cho bạn
const getNewReleases = async (req, res) => {
    try {
        const bannerLimit = parseInt(req.query.bannerLimit) || 5; // List phim cho banner
        const gridLimit = parseInt(req.query.limit) || 6; // 6 phim cho grid "Phim dành cho bạn"
        const days = parseInt(req.query.days) || 30;

        // Lấy phim mới nhất cho banner và grid - chỉ dùng field có sẵn trong schema
        const newReleases = await Movie.find({
            release_status: 'released',
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
        })
            .populate('genres', 'genre_name') // Lấy tên thể loại có sẵn
            .select('_id movie_title poster_path description production_time movie_type producer') // Chỉ dùng field có sẵn
            .sort({ createdAt: -1 })
            .limit(bannerLimit + gridLimit);

        // List phim cho banner section
        const bannerMovies = newReleases.slice(0, bannerLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title,
            poster: movie.poster_path,
            description: movie.description, // Mô tả phim
            releaseYear: movie.production_time ? new Date(movie.production_time).getFullYear() : null,
            movieType: movie.movie_type,
            producer: movie.producer,
            genres: movie.genres ? movie.genres.slice(0, 3).map(g => g.genre_name) : []
        }));

        // List phim cho grid "Phim dành cho bạn"
        const gridMovies = newReleases.slice(0, gridLimit).map(movie => ({
            movieId: movie._id,
            title: movie.movie_title,
            poster: movie.poster_path, // Chỉ poster cho grid
            movieType: movie.movie_type,
            producer: movie.producer
        }));

        res.json({
            status: 'success',
            data: {
                // Banner section - List phim mới
                banner: {
                    title: "Phim mới ra mắt",
                    type: "banner_list",
                    movies: bannerMovies
                },
                
                // Grid section - "Phim dành cho bạn" 
                recommended: {
                    title: "Phim dành cho bạn",
                    type: "grid",
                    movies: gridMovies
                }
            }
        });
    } catch (error) {
        console.error('Error fetching new releases:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim mới',
            error: error.message
        });
    }
};

// 2. ▶️ Continue Watching - Đang xem (không cần rating/view)
const getContinueWatching = async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 8;

        const watchingData = await Watching.find({
            user_id: userId,
            completed: false
        })
            .populate({
                path: 'episode_id',
                populate: {
                    path: 'movie_id',
                    select: '_id movie_title poster_path movie_type'
                }
            })
            .sort({ last_watched: -1 })
            .limit(limit);

        const continueWatching = watchingData.map(watch => ({
            movieId: watch.episode_id.movie_id._id,
            title: watch.episode_id.movie_id.movie_title,
            poster: watch.episode_id.movie_id.poster_path,
            movieType: watch.episode_id.movie_id.movie_type,
            lastWatchedAt: watch.last_watched,
            progress: Number((watch.current_time / watch.duration).toFixed(2)),
            episodeId: watch.episode_id._id,
            currentTime: watch.current_time,
            duration: watch.duration
        }));

        res.json({
            status: 'success',
            data: {
                title: "Đang xem",
                type: "continue_watching",
                data: continueWatching
            }
        });
    } catch (error) {
        console.error('Error fetching continue watching:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách đang xem',
            error: error.message
        });
    }
};

// 3. 🎭 Genre Sections - Theo thể loại (có rating & viewCount)
const getGenreSections = async (req, res) => {
    try {
        const genreLimit = parseInt(req.query.genreLimit) || 4;
        const movieLimit = 4; // Fixed to 4 movies per genre for 2x2 grid

        // Chỉ lấy thể loại đang hoạt động
        const topGenres = await Genre.find({ is_active: true })
            .sort({ createdAt: -1 })
            .limit(genreLimit);

        const genreSections = await Promise.all(
            topGenres.map(async (genre) => {
                const movies = await Movie.find({ genres: genre._id })
                    .populate({
                        path: 'genres',
                        match: { is_active: true }, // Chỉ populate thể loại hoạt động
                        select: 'genre_name'
                    })
                    .select('_id movie_title poster_path movie_type')
                    .sort({ createdAt: -1 })
                    .limit(movieLimit);

                // Lọc các phim có ít nhất 1 thể loại hoạt động
                const validMovies = movies.filter(movie => movie.genres && movie.genres.length > 0);

                // Tính rating và view count cho từng movie trong genre
                const moviesWithStats = await Promise.all(
                    validMovies.map(async (movie) => {
                        const [ratingData, viewCount] = await Promise.all([
                            calculateMovieRating(movie._id),
                            calculateViewCount(movie._id)
                        ]);

                        return {
                            movieId: movie._id,
                            title: movie.movie_title,
                            poster: movie.poster_path,
                            movieType: movie.movie_type,
                            rating: ratingData.rating,
                            likeCount: ratingData.likeCount,
                            viewCount,
                            viewCountFormatted: formatViewCount(viewCount)
                        };
                    })
                );

                // Format for UI: genre name + 4 posters (2x2 grid)
                return {
                    genre: genre.genre_name,
                    genreId: genre._id,
                    isActive: genre.is_active,
                    totalMovies: moviesWithStats.length,
                    movies: moviesWithStats,
                    // Simplified format for UI grid display
                    posterGrid: moviesWithStats.slice(0, 4).map(movie => ({
                        movieId: movie.movieId,
                        poster: movie.poster,
                        title: movie.title
                    }))
                };
            })
        );

        // Chỉ trả về genres có ít nhất 1 movie và đang hoạt động
        const validSections = genreSections.filter(section => 
            section.movies.length > 0 && section.isActive
        );

        res.json({
            status: 'success',
            data: {
                title: "Theo thể loại",
                type: "genre_sections",
                data: validSections
            }
        });
    } catch (error) {
        console.error('Error fetching genre sections:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim theo thể loại',
            error: error.message
        });
    }
};

// 4. 🔥 Trending Movies - Phim thịnh hành (có rating & viewCount)
const getTrendingMovies = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Lấy movies để tính view count
        const allMovies = await Movie.find()
            .select('_id movie_title poster_path movie_type production_time')
            .limit(50); // Giới hạn để performance tốt hơn

        // Tính rating và view count cho từng movie
        const moviesWithStats = await Promise.all(
            allMovies.map(async (movie) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(movie._id),
                    calculateViewCount(movie._id)
                ]);

                return {
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    movieType: movie.movie_type,
                    releaseDate: movie.production_time,
                    rating: ratingData.rating,
                    likeCount: ratingData.likeCount,
                    viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            })
        );

        // Sort theo view count và lấy top
        const trendingMovies = moviesWithStats
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit);

        res.json({
            status: 'success',
            data: {
                title: "Phim đang thịnh hành",
                type: "trending",
                data: trendingMovies
            }
        });
    } catch (error) {
        console.error('Error fetching trending movies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim thịnh hành',
            error: error.message
        });
    }
};

// 5. ⭐ Top Rated Movies - Phim được đánh giá cao (có rating & viewCount)
const getTopRatedMovies = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const allMovies = await Movie.find()
            .select('_id movie_title poster_path movie_type production_time')
            .limit(50);

        // Tính rating và view count cho từng movie
        const moviesWithStats = await Promise.all(
            allMovies.map(async (movie) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(movie._id),
                    calculateViewCount(movie._id)
                ]);

                return {
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    movieType: movie.movie_type,
                    releaseDate: movie.production_time,
                    rating: ratingData.rating,
                    likeCount: ratingData.likeCount,
                    viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            })
        );

        // Sort theo rating và lấy top (chỉ lấy movies có rating > 0)
        const topRatedMovies = moviesWithStats
            .filter(movie => movie.rating > 0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit);

        res.json({
            status: 'success',
            data: {
                title: "Phim được đánh giá cao",
                type: "top_rated",
                data: topRatedMovies
            }
        });
    } catch (error) {
        console.error('Error fetching top rated movies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim được đánh giá cao',
            error: error.message
        });
    }
};

// 6. ⚽ Sports Events - Sự kiện thể thao (có rating & viewCount)
const getSportsEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status; // upcoming, live, ended

        let query = { movie_type: 'Thể thao' };

        if (status && ['upcoming', 'live', 'ended'].includes(status)) {
            query.event_status = status;
        }

        const sportsEvents = await Movie.find(query)
            .select('_id movie_title poster_path description event_start_time event_status producer')
            .sort({ event_start_time: 1, createdAt: -1 })
            .limit(limit);

        // Tính rating và view count cho sports events
        const eventsWithStats = await Promise.all(
            sportsEvents.map(async (event) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(event._id),
                    calculateViewCount(event._id)
                ]);

                return {
                    eventId: event._id,
                    title: event.movie_title,
                    poster: event.poster_path,
                    description: event.description,
                    startTime: event.event_start_time,
                    status: event.event_status || 'upcoming',
                    producer: event.producer,
                    rating: ratingData.rating,
                    likeCount: ratingData.likeCount,
                    viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            })
        );

        res.json({
            status: 'success',
            data: {
                title: "Sự kiện thể thao",
                type: "sports",
                data: eventsWithStats
            }
        });
    } catch (error) {
        console.error('Error fetching sports events:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy sự kiện thể thao',
            error: error.message
        });
    }
};

// 7. 🌸 Anime Hot - Anime nổi bật (có rating & viewCount)
const getAnimeHot = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        const animeGenre = await Genre.findOne({ genre_name: /anime/i });
        let animeMovies = [];

        if (animeGenre) {
            animeMovies = await Movie.find({ genres: animeGenre._id })
                .select('_id movie_title poster_path production_time')
                .sort({ createdAt: -1 })
                .limit(limit);
        }

        // Tính rating và view count cho anime
        const animeWithStats = await Promise.all(
            animeMovies.map(async (movie) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(movie._id),
                    calculateViewCount(movie._id)
                ]);

                return {
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    releaseDate: movie.production_time,
                    rating: ratingData.rating,
                    likeCount: ratingData.likeCount,
                    viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            })
        );

        res.json({
            status: 'success',
            data: {
                title: "Anime hot",
                type: "anime_hot",
                data: animeWithStats
            }
        });
    } catch (error) {
        console.error('Error fetching anime hot:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy anime hot',
            error: error.message
        });
    }
};

// 8. 🇻🇳 Vietnamese Series - Phim Việt đặc sắc (có rating & viewCount)
const getVietnameseSeries = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        const vietnamSeries = await Movie.find({
            movie_type: { $in: ['Phim bộ', 'Phim lẻ'] }, // ✅ Both types
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
            .select('_id movie_title poster_path producer production_time movie_type')
            .sort({ createdAt: -1 })
            .limit(limit);

        // Tính rating và view count cho Vietnamese series
        const seriesWithStats = await Promise.all(
            vietnamSeries.map(async (movie) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(movie._id),
                    calculateViewCount(movie._id)
                ]);

                return {
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    producer: movie.producer,
                    releaseDate: movie.production_time,
                    movieType: movie.movie_type,
                    rating: ratingData.rating,
                    likeCount: ratingData.likeCount,
                    viewCount,
                    viewCountFormatted: formatViewCount(viewCount)
                };
            })
        );

        res.json({
            status: 'success',
            data: {
                title: "Phim Việt đặc sắc",
                type: "vietnam_series",
                data: seriesWithStats
            }
        });
    } catch (error) {
        console.error('Error fetching Vietnamese series:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim Việt',
            error: error.message
        });
    }
};

// 9. 🔜 Coming Soon - Sắp công chiếu (không cần rating/view)
const getComingSoon = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        const comingSoon = await Movie.find({
            release_status: 'upcoming',
            production_time: { $gte: new Date() }
        })
            .select('_id movie_title poster_path production_time producer description')
            .sort({ production_time: 1 })
            .limit(limit);

        res.json({
            status: 'success',
            data: {
                title: "Sắp công chiếu",
                type: "coming_soon",
                data: comingSoon.map(movie => ({
                    movieId: movie._id,
                    title: movie.movie_title,
                    poster: movie.poster_path,
                    releaseDate: movie.production_time,
                    producer: movie.producer,
                    description: movie.description
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching coming soon movies:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim sắp công chiếu',
            error: error.message
        });
    }
};

// ==============================================
// EXPORT CONTROLLERS
// ==============================================

module.exports = {
    getNewReleases,
    getContinueWatching,
    getGenreSections,
    getTrendingMovies,
    getTopRatedMovies,
    getSportsEvents,
    getAnimeHot,
    getVietnameseSeries,
    getComingSoon
};
