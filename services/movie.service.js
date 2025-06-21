const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Favorite = require('../models/Favorite');
const { validatePrice, validateEpisodes, validateGenres, determineMovieType, validateMovieData } = require('../validators/movieValidator');

/**
 * 🎬 CORE MOVIE CREATION SERVICE
 * Centralized service for all movie creation operations
 */
const createMovie = async (movieData) => {
    try {
        // Validate price
        const validatedPrice = validatePrice(movieData.price);

        // Validate episodes and get episode info
        const { maxEpisodeNumber } = validateEpisodes(movieData.episodes);

        // Validate genres
        const validatedGenres = await validateGenres(movieData.genres, Genre);

        // Determine movie type
        const movie_type = determineMovieType(maxEpisodeNumber);

        // Create movie
        const newMovie = await Movie.create({
            movie_title: movieData.movie_title,
            description: movieData.description,
            production_time: movieData.production_time,
            producer: movieData.producer,
            poster_path: movieData.poster_path,
            genres: validatedGenres.map(genre => genre._id),
            price: validatedPrice,
            movie_type: movie_type,
            total_episodes: maxEpisodeNumber,
            is_free: validatedPrice === 0
        });

        // Create episodes using centralized method
        const episodes = await createEpisodesForMovie(newMovie._id, movieData.episodes, movie_type);

        // Populate genres for response
        await newMovie.populate('genres', 'genre_name description is_active');

        return { newMovie, episodes };
    } catch (error) {
        throw error;
    }
};

/**
 * 🎬 COMPREHENSIVE MOVIE CREATION (All Types)
 * Supports: Regular Movies, Sports Events, Anime
 */
const createMovieComprehensive = async (movieData) => {
    try {
        // Use comprehensive validation
        const validatedData = validateMovieData(movieData);

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

        // Validate genres exist
        const validGenres = await Genre.find({ _id: { $in: genres } });
        if (validGenres.length !== genres.length) {
            throw new Error('Một hoặc nhiều thể loại không tồn tại');
        }

        // Create movie data object
        const movieCreateData = {
            movie_title,
            description,
            production_time,
            producer,
            price,
            movie_type,
            genres,
            total_episodes: maxEpisodeNumber,
            poster_path: poster_path || '',
            is_free: price === 0
        };

        // Handle sports events special fields
        if (movie_type === 'Thể thao') {
            movieCreateData.event_start_time = event_start_time;
            movieCreateData.event_status = event_status;
        }

        // Create movie
        const newMovie = new Movie(movieCreateData);
        await newMovie.save();

        // Create episodes
        const episodes = await createEpisodesForMovie(newMovie._id, movieData.episodes, movie_type);

        // Populate genres
        await newMovie.populate('genres', 'genre_name description is_active');

        return { newMovie, episodes };
    } catch (error) {
        throw error;
    }
};

/**
 * ⚽ SPORTS EVENT CREATION SERVICE
 */
const createSportsEvent = async (sportsData) => {
    try {
        const movieData = {
            ...sportsData,
            movie_type: 'Thể thao'
        };

        return await createMovieComprehensive(movieData);
    } catch (error) {
        throw error;
    }
};

/**
 * 📺 CENTRALIZED EPISODE CREATION
 * Handles episode creation for all movie types
 */
const createEpisodesForMovie = async (movieId, episodesData, movieType) => {
    try {
        const episodes = await Promise.all(episodesData.map(async (ep, index) => {
            return await Episode.create({
                episode_title: ep.episode_title,
                uri: ep.uri,
                episode_number: movieType === 'Thể thao' ? 1 : ep.episode_number,
                episode_description: ep.episode_description || '',
                duration: ep.duration || 0,
                movie_id: movieId
            });
        }));

        return episodes;
    } catch (error) {
        throw error;
    }
};

/**
 * 🔄 UPDATE MOVIE SERVICE
 */
const updateMovie = async (movieId, updateData) => {
    try {
        // Validate update data if price is being updated
        if (updateData.price !== undefined) {
            updateData.price = validatePrice(updateData.price);
            updateData.is_free = updateData.price === 0;
        }

        // Update movie
        const updatedMovie = await Movie.findByIdAndUpdate(
            movieId,
            updateData,
            { new: true, runValidators: true }
        ).populate('genres', 'genre_name description is_active');

        if (!updatedMovie) {
            throw new Error('Không tìm thấy phim');
        }

        // Update episodes if provided
        let episodes = [];
        if (updateData.episodes && updateData.episodes.length > 0) {
            // Delete old episodes
            await Episode.deleteMany({ movie_id: movieId });

            // Create new episodes
            episodes = await createEpisodesForMovie(movieId, updateData.episodes, updatedMovie.movie_type);
        } else {
            // Get existing episodes
            episodes = await Episode.find({ movie_id: movieId })
                .select('episode_title uri episode_number episode_description duration createdAt updatedAt')
                .sort({ episode_number: 1 });
        }

        return { updatedMovie, episodes };
    } catch (error) {
        throw error;
    }
};

/**
 * 🎯 GET MOVIE BY ID WITH EPISODES
 */
const getMovieById = async (movieId) => {
    try {
        const movie = await Movie.findById(movieId)
            .populate('genres', 'genre_name description is_active');

        if (!movie) {
            throw new Error('Không tìm thấy phim');
        }

        const episodes = await Episode.find({ movie_id: movieId })
            .select('episode_title uri episode_number episode_description duration createdAt updatedAt')
            .sort({ episode_number: 1 });

        return { movie, episodes };
    } catch (error) {
        throw error;
    }
};

/**
 * 🔥 GET TOP FAVORITE MOVIES
 * Enhanced version with time range support
 */
const getTopFavoriteMovies = async (limit = 10, timeRange = null) => {
    try {
        // Build time condition if provided
        const timeCondition = {};
        if (timeRange) {
            const now = new Date();
            switch (timeRange) {
                case 'week':
                    timeCondition.createdAt = {
                        $gte: new Date(now.setDate(now.getDate() - 7))
                    };
                    break;
                case 'month':
                    timeCondition.createdAt = {
                        $gte: new Date(now.setMonth(now.getMonth() - 1))
                    };
                    break;
                case 'year':
                    timeCondition.createdAt = {
                        $gte: new Date(now.setFullYear(now.getFullYear() - 1))
                    };
                    break;
            }
        }

        // Aggregate to count favorites and get movie info
        const topMovies = await Favorite.aggregate([
            // Filter by time if provided
            ...(Object.keys(timeCondition).length > 0 ? [{$match: timeCondition}] : []),
            
            // Group by movie_id and count favorites
            {
                $group: {
                    _id: '$movie_id',
                    favoriteCount: { $sum: 1 }
                }
            },

            // Sort by favorite count descending
            {
                $sort: { favoriteCount: -1 }
            },

            // Limit results
            {
                $limit: limit
            },

            // Lookup movie information
            {
                $lookup: {
                    from: 'movies',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'movie'
                }
            },

            // Unwind movie array
            {
                $unwind: '$movie'
            },

            // Lookup genre information
            {
                $lookup: {
                    from: 'genres',
                    localField: 'movie.genres',
                    foreignField: '_id',
                    as: 'movie.genres'
                }
            },

            // Project to format result
            {
                $project: {
                    _id: '$movie._id',
                    movie_title: '$movie.movie_title',
                    description: '$movie.description',
                    production_time: '$movie.production_time',
                    producer: '$movie.producer',
                    poster_path: '$movie.poster_path',
                    genres: {
                        $filter: {
                            input: '$movie.genres',
                            as: 'genre',
                            cond: { $eq: ['$$genre.is_active', true] }
                        }
                    },
                    movie_type: '$movie.movie_type',
                    price: '$movie.price',
                    is_free: '$movie.is_free',
                    total_episodes: '$movie.total_episodes',
                    favoriteCount: 1
                }
            }
        ]);

        // Get episode information for each movie
        const moviesWithEpisodes = await Promise.all(topMovies.map(async (movie) => {
            const episodes = await Episode.find({ movie_id: movie._id })
                .select('episode_title uri episode_number episode_description')
                .sort({ episode_number: 1 });

            return {
                ...movie,
                episodes: movie.is_free ? episodes : episodes.map(ep => ({
                    ...ep.toObject(),
                    uri: null,
                    is_locked: true
                }))
            };
        }));

        return moviesWithEpisodes;
    } catch (error) {
        throw error;
    }
};

/**
 * 🗑️ DELETE MOVIE SERVICE
 */
const deleteMovie = async (movieId) => {
    try {
        // Delete associated episodes first
        await Episode.deleteMany({ movie_id: movieId });

        // Delete movie
        const deletedMovie = await Movie.findByIdAndDelete(movieId);

        if (!deletedMovie) {
            throw new Error('Không tìm thấy phim');
        }

        return deletedMovie;
    } catch (error) {
        throw error;
    }
};

/**
 * 🔍 SEARCH MOVIES SERVICE
 */
const searchMovies = async (query, options = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            genre,
            movie_type,
            price_type
        } = options;

        const skip = (page - 1) * limit;

        // Build search criteria
        const searchCriteria = {
            $or: [
                { movie_title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { producer: { $regex: query, $options: 'i' } }
            ]
        };

        // Add filters
        if (genre) {
            searchCriteria.genres = genre;
        }
        if (movie_type) {
            searchCriteria.movie_type = movie_type;
        }
        if (price_type === 'free') {
            searchCriteria.price = 0;
        } else if (price_type === 'paid') {
            searchCriteria.price = { $gt: 0 };
        }

        // Execute search
        const [movies, total] = await Promise.all([
            Movie.find(searchCriteria)
                .populate('genres', 'genre_name')
                .select('movie_title description production_time producer movie_type price is_free poster_path')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Movie.countDocuments(searchCriteria)
        ]);

        return {
            movies,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        throw error;
    }
};

/**
 * 📊 GET RECENT MOVIES SERVICE
 */
const getRecentMovies = async (limit = 5) => {
    try {
        const recentMovies = await Movie.find()
            .select('movie_title description production_time producer movie_type price is_free price_display')
            .sort({ production_time: -1 })
            .limit(limit);

        // Process each movie and get episodes
        const moviesWithDetails = await Promise.all(recentMovies.map(async (movie) => {
            const episodes = await Episode.find({ movie_id: movie._id })
                .select('episode_title uri episode_number episode_description duration createdAt updatedAt')
                .sort({ episode_number: 1 });

            return movie.formatMovieResponse(episodes);
        }));

        return moviesWithDetails;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    createMovie,
    createMovieComprehensive,
    createSportsEvent,
    createEpisodesForMovie,
    updateMovie,
    getMovieById,
    getTopFavoriteMovies,
    deleteMovie,
    searchMovies,
    getRecentMovies
}; 