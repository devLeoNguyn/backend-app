const Movie = require('../models/Movie');
const Genre = require('../models/Genre');
const Watching = require('../models/Watching');
const Episode = require('../models/Episode');
const Rating = require('../models/Rating');
const mongoose = require('mongoose');

// Import shared utility functions (eliminates duplication)
const {
    calculateMovieRating,
    calculateViewCount,
    formatViewCount
} = require('../utils/movieStatsUtils');

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
        const { userId } = req.query;
        const limit = parseInt(req.query.limit) || 8;

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }

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
        const { use_hierarchy = 'false' } = req.query; // Option để chọn hierarchical hay simple

        let topGenres;

        if (use_hierarchy === 'true') {
            // Sử dụng hierarchical genres - chỉ lấy parent genres
            topGenres = await Genre.find({ 
                parent_genre: null, // Chỉ lấy thể loại cha
                is_active: true 
            })
            .sort({ sort_order: 1, createdAt: -1 })
            .limit(genreLimit);
        } else {
            // Sử dụng simple flow - lấy tất cả genres như cũ
            topGenres = await Genre.find({ is_active: true })
                .sort({ createdAt: -1 })
                .limit(genreLimit);
        }

        const genreSections = await Promise.all(
            topGenres.map(async (genre) => {
                let genreIds = [genre._id];
                
                // Nếu dùng hierarchy và là parent genre, bao gồm cả children
                if (use_hierarchy === 'true' && (!genre.parent_genre)) {
                    const childGenres = await Genre.find({ 
                        parent_genre: genre._id, 
                        is_active: true 
                    }).select('_id');
                    genreIds.push(...childGenres.map(child => child._id));
                }

                const movies = await Movie.find({ genres: { $in: genreIds } })
                    .populate({
                        path: 'genres',
                        match: { is_active: true }, // Chỉ populate thể loại hoạt động
                        select: 'genre_name parent_genre is_parent'
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

                // Check if has children (for hierarchical flow)
                const hasChildren = use_hierarchy === 'true' ? await genre.hasChildren() : false;

                // Format for UI: genre name + 4 posters (2x2 grid)
                return {
                    genre: genre.genre_name,
                    genreId: genre._id,
                    isActive: genre.is_active,
                    isParent: !genre.parent_genre, // true nếu là parent genre
                    hasChildren: hasChildren,
                    useHierarchy: use_hierarchy === 'true',
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
                use_hierarchy: use_hierarchy === 'true',
                flow_type: use_hierarchy === 'true' ? 'hierarchical' : 'simple',
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

// 4. 🔥 Trending Movies - Phim thịnh hành (tính toán nhưng trả về đơn giản)
const getTrendingMovies = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Lấy movies để tính view count
        const allMovies = await Movie.find({ release_status: 'released' })
            .select('_id movie_title poster_path movie_type producer')
            .limit(50); // Giới hạn để performance tốt hơn

        // Tính rating và view count cho từng movie (để sort)
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
                    producer: movie.producer,
                    viewCount // Chỉ dùng để sort, không trả về
                };
            })
        );

        // Sort theo view count và lấy top, nhưng chỉ trả về format đơn giản
        const trendingMovies = moviesWithStats
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, limit)
            .map(movie => ({
                movieId: movie.movieId,
                title: movie.title,
                poster: movie.poster,
                movieType: movie.movieType,
                producer: movie.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: "Phim đang thịnh hành",
                type: "grid",
                movies: trendingMovies
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

// 5. ⭐ Top Rated Movies - Phim được đánh giá cao (tính toán nhưng trả về đơn giản)
const getTopRatedMovies = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        const allMovies = await Movie.find({ release_status: 'released' })
            .select('_id movie_title poster_path movie_type producer')
            .limit(50); // Giới hạn để performance tốt hơn

        // Tính rating và view count cho từng movie (để sort)
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
                    producer: movie.producer,
                    rating: ratingData.rating // Chỉ dùng để sort, không trả về
                };
            })
        );

        // Sort theo rating và lấy top, nhưng chỉ trả về format đơn giản
        const topRatedMovies = moviesWithStats
            .filter(movie => movie.rating > 0) // Chỉ lấy phim có rating
            .sort((a, b) => b.rating - a.rating)
            .slice(0, limit)
            .map(movie => ({
                movieId: movie.movieId,
                title: movie.title,
                poster: movie.poster,
                movieType: movie.movieType,
                producer: movie.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: "Phim được đánh giá cao",
                type: "grid",
                movies: topRatedMovies
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

// 6. ⚽ Sports Events - Sự kiện thể thao (giữ logic đặc trưng nhưng trả về đơn giản)
const getSportsEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;
        const status = req.query.status; // upcoming, released, ended

        // Logic đặc trưng: Query theo movie_type và status
        let query = { movie_type: 'Thể thao' };

        if (status && ['upcoming', 'released', 'ended'].includes(status)) {
            query.event_status = status;
        }

        const sportsEvents = await Movie.find(query)
            .select('_id movie_title poster_path event_start_time event_status producer')
            .sort({ event_start_time: 1, createdAt: -1 }) // Logic đặc trưng: Sort theo event time
            .limit(limit);

        // Tính rating và view count (để sort nếu cần) nhưng chỉ trả về format đơn giản
        const eventsWithStats = await Promise.all(
            sportsEvents.map(async (event) => {
                const [ratingData, viewCount] = await Promise.all([
                    calculateMovieRating(event._id),
                    calculateViewCount(event._id)
                ]);

                return {
                    movieId: event._id,
                    title: event.movie_title,
                    poster: event.poster_path,
                    movieType: 'Thể thao', // Fixed cho sports
                    producer: event.producer,
                    // Logic đặc trưng: Giữ lại để sort hoặc filter trong tương lai
                    startTime: event.event_start_time,
                    status: event.event_status || 'released', // Thay đổi mặc định thành 'released'
                    viewCount: viewCount, 
                    rating: ratingData.rating
                };
            })
        );

        // Chỉ trả về format đơn giản cho frontend
        const simpleSportsEvents = eventsWithStats.map(event => ({
            movieId: event.movieId,
            title: event.title,
            poster: event.poster,
            movieType: event.movieType,
            producer: event.producer
        }));

        res.json({
            status: 'success',
            data: {
                title: "Sự kiện thể thao",
                type: "grid",
                movies: simpleSportsEvents
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

// 7. 🌸 Anime Hot - Anime nổi bật (giữ logic đặc trưng nhưng trả về đơn giản)
const getAnimeHot = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        // Logic đặc trưng: Tìm genre anime
        const animeGenre = await Genre.findOne({ genre_name: /hoạt hình/i });
        let animeMovies = [];

        if (animeGenre) {
            animeMovies = await Movie.find({ 
                genres: animeGenre._id,
                release_status: 'released' 
            })
                .select('_id movie_title poster_path movie_type producer')
                .sort({ createdAt: -1 })
                .limit(limit);
        }

        // Tính rating và view count (để sort nếu cần) nhưng chỉ trả về format đơn giản
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
                    movieType: movie.movie_type,
                    producer: movie.producer,
                    rating: ratingData.rating, // Chỉ dùng để sort, không trả về
                    viewCount: viewCount
                };
            })
        );

        // Sort theo popularity (viewCount) và chỉ trả về format đơn giản
        const simpleAnimeMovies = animeWithStats
            .sort((a, b) => b.viewCount - a.viewCount)
            .map(movie => ({
                movieId: movie.movieId,
                title: movie.title,
                poster: movie.poster,
                movieType: movie.movieType,
                producer: movie.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: "Anime hot",
                type: "grid",
                movies: simpleAnimeMovies
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

// 8. 🇻🇳 Vietnamese Series - Phim Việt đặc sắc (giữ logic đặc trưng nhưng trả về đơn giản)
const getVietnameseSeries = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 8;

        // Logic đặc trưng: Complex query tìm phim Việt Nam
        const vietnamSeries = await Movie.find({
            movie_type: { $in: ['Phim bộ', 'Phim lẻ'] }, // ✅ Both types
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
            .limit(limit);

        // Tính rating và view count (để sort nếu cần) nhưng chỉ trả về format đơn giản
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
                    movieType: movie.movie_type,
                    rating: ratingData.rating, // Chỉ dùng để sort, không trả về
                    viewCount: viewCount
                };
            })
        );

        // Sort theo rating và chỉ trả về format đơn giản
        const simpleVietnameseSeries = seriesWithStats
            .sort((a, b) => b.rating - a.rating)
            .map(movie => ({
                movieId: movie.movieId,
                title: movie.title,
                poster: movie.poster,
                movieType: movie.movieType,
                producer: movie.producer
            }));

        res.json({
            status: 'success',
            data: {
                title: "Phim Việt đặc sắc",
                type: "grid",
                movies: simpleVietnameseSeries
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
