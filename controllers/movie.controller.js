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

        // Format response khác nhau cho phim lẻ và phim bộ
        let movieData = {};
        
        if (movie.movie_type === 'Phim lẻ') {
            // Phim lẻ: Chỉ thông tin cơ bản + URI của tập duy nhất
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
                // Thông tin video cho phim lẻ
                uri: movie.is_free && singleEpisode ? singleEpisode.uri : null,
                duration: singleEpisode ? singleEpisode.duration : null,
                is_locked: !movie.is_free
            };
        } else {
            // Phim bộ: Sử dụng method có sẵn
            movieData = movie.formatMovieResponse(episodes);
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

            // UI Config cho tabs
            tabs: {
                showEpisodesList: movie.movie_type === 'Phim bộ', // Chỉ show tab "Danh sách" cho phim bộ
                showRelated: true // Luôn show tab "Liên quan"
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



const searchMovies = async (req, res) => {
  try {
    const {
      tuKhoa,     // Từ khóa tìm kiếm (tên phim, nhà sản xuất)
      theLoai,    // ID thể loại (ObjectId)
      loaiPhim,   // 'Phim lẻ', 'Phim bộ'
      mienphi,    // true / false (string)
      sapXep      // 'moi-nhat' / 'cu-nhat'
    } = req.query;

    const dieuKien = {};

    // Tìm theo từ khóa
    if (tuKhoa && tuKhoa.trim()) {
      dieuKien.$or = [
        { movie_title: { $regex: tuKhoa.trim(), $options: 'i' } },
        { producer: { $regex: tuKhoa.trim(), $options: 'i' } }
      ];
    }

    // Lọc theo thể loại
    if (theLoai) {
      dieuKien.genres = theLoai;
    }

    // Lọc theo loại phim
    if (loaiPhim) {
      dieuKien.movie_type = loaiPhim;
    }

    // Lọc theo miễn phí
    if (mienphi !== undefined) {
      dieuKien.is_free = mienphi === 'true';
    }

    // Khởi tạo truy vấn
    let query = Movie.find(dieuKien)
      .select('movie_title description production_time producer movie_type price is_free price_display poster_path genres')
      .populate('genres', 'name');

    // Sắp xếp
    if (sapXep === 'moi-nhat') {
      query = query.sort({ production_time: -1 });
    } else if (sapXep === 'cu-nhat') {
      query = query.sort({ production_time: 1 });
    }

    const movies = await query.exec();

    // Xử lý chi tiết tập phim
    const moviesWithDetails = await Promise.all(
      movies.map(async (movie) => {
        const episodes = await Episode.find({ movie_id: movie._id })
          .select('episode_title uri episode_number episode_description')
          .sort({ episode_number: 1 });

        const movieObj = movie.toObject();

        if (episodes.length > 1) {
          movieObj.movie_type = 'Phim bộ';
          movieObj.episodes = episodes.map((ep) => ({
            episode_title: ep.episode_title,
            episode_number: ep.episode_number,
            uri: movieObj.is_free ? ep.uri : null
          }));
          movieObj.total_episodes = episodes.length;
        } else if (episodes.length === 1) {
          movieObj.movie_type = 'Phim lẻ';
          movieObj.uri = movieObj.is_free ? episodes[0].uri : null;
          movieObj.episode_description = episodes[0].episode_description;
        }

        // Trả về ảnh poster chính xác (nếu có)
        movieObj.poster = movie.poster_path || null;

        return movieObj;
      })
    );

    res.json({
      status: 'success',
      data: {
        movies: moviesWithDetails,
        total: moviesWithDetails.length
      }
    });
  } catch (err) {
    console.error('Lỗi khi tìm kiếm phim:', err);
    res.status(500).json({
      status: 'error',
      message: 'Lỗi server',
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