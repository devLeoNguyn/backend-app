const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const { createMovie } = require('../services/movie.service');

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

            const movieObj = movie.toObject();

            // Nếu có nhiều hơn 1 tập -> phim bộ
            if (episodes.length > 1) {
                movieObj.movie_type = 'Phim bộ';
                movieObj.episodes = episodes.map(ep => ({
                    episode_title: ep.episode_title,
                    episode_number: ep.episode_number,
                    uri: movieObj.is_free ? ep.uri : null
                }));
                movieObj.total_episodes = episodes.length;
            } 
            // Nếu chỉ có 1 tập -> phim lẻ
            else if (episodes.length === 1) {
                movieObj.movie_type = 'Phim lẻ';
                movieObj.uri = movieObj.is_free ? episodes[0].uri : null;
                movieObj.episode_description = episodes[0].episode_description;
            }

            return movieObj;
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

// Thêm phim mới
const createMovieController = async (req, res) => {
    try {
        // Gọi service để tạo movie và episodes
        const { newMovie, episodes } = await createMovie(req.body);

        // Format response
         const formattedMovie = newMovie.formatMovieResponse(episodes);

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
            message: 'Error creating movie',
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
            .select('episode_title uri episode_number episode_description')
            .sort({ episode_number: 1 });

        const responseData = formatMovieResponse(movie, episodes);

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
        const { newMovie, episodes } = await createMovie(req.body);
        const responseData = formatMovieResponse(newMovie, episodes);

        res.json({
            status: 'success',
            data: {
                movie: responseData
            }
        });
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

module.exports = {
    getNewWeekMovies,
    createMovieController,
    getMovieById,
    updateMovie,
    deleteMovie
};