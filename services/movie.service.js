const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const Genre = require('../models/Genre');
const Favorite = require('../models/Favorite');
const { validatePrice, validateEpisodes, validateGenres, determineMovieType } = require('../validators/movieValidator');

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

        // Create episodes
        const episodes = await Promise.all(movieData.episodes.map(async (ep) => {
            return await Episode.create({
                episode_title: ep.episode_title,
                uri: ep.uri,
                episode_number: ep.episode_number,
                episode_description: ep.episode_description || '',
                movie_id: newMovie._id
            });
        }));

        // Populate genres for response
        await newMovie.populate('genres', 'name description is_active');

        return { newMovie, episodes };
    } catch (error) {
        throw error;
    }
};

const getTopFavoriteMovies = async (limit = 10, timeRange = null) => {
    try {
        // Xây dựng điều kiện thời gian nếu có
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

        // Aggregate để đếm số lượt yêu thích và lấy thông tin phim
        const topMovies = await Favorite.aggregate([
            // Lọc theo thời gian nếu có
            ...(Object.keys(timeCondition).length > 0 ? [{$match: timeCondition}] : []),
            
            // Nhóm theo movie_id và đếm số lượt yêu thích
            {
                $group: {
                    _id: '$movie_id',
                    favoriteCount: { $sum: 1 }
                }
            },

            // Sắp xếp theo số lượt yêu thích giảm dần
            {
                $sort: { favoriteCount: -1 }
            },

            // Giới hạn số lượng kết quả
            {
                $limit: limit
            },

            // Lookup để lấy thông tin phim
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

            // Lookup để lấy thông tin thể loại
            {
                $lookup: {
                    from: 'genres',
                    localField: 'movie.genres',
                    foreignField: '_id',
                    as: 'movie.genres'
                }
            },

            // Project để format kết quả
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

        // Lấy thông tin episodes cho mỗi phim
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

// const formatMovieResponse = (movie, episodes) => {
//     const responseData = movie.toObject();
    
//     if (responseData.movie_type === 'Phim bộ') {
//         // Sắp xếp episodes theo episode_number
//         episodes.sort((a, b) => a.episode_number - b.episode_number);
//         responseData.episodes = episodes.map(ep => ({
//             ...ep.toObject(),
//             uri: responseData.is_free ? ep.uri : null
//         }));
//     } else {
//         responseData.uri = responseData.is_free ? episodes[0].uri : null;
//         responseData.episode_description = episodes[0].episode_description;
//     }

//     return responseData;
// };

module.exports = {
    createMovie,
    getTopFavoriteMovies
}; 