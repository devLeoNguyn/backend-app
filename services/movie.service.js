const Movie = require('../models/Movie');
const Episode = require('../models/Episode');
const { validatePrice, validateEpisodes, determineMovieType } = require('../validators/movieValidator');

const createMovie = async (movieData) => {
    try {
        // Validate price
        const validatedPrice = validatePrice(movieData.price);

        // Validate episodes and get episode info
        const { maxEpisodeNumber } = validateEpisodes(movieData.episodes);

        // Determine movie type
        const movie_type = determineMovieType(maxEpisodeNumber);

        // Create movie
        const newMovie = await Movie.create({
            movie_title: movieData.movie_title,
            description: movieData.description,
            production_time: movieData.production_time,
            producer: movieData.producer,
            price: validatedPrice,
            movie_type: movie_type,
            total_episodes: maxEpisodeNumber
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

        return { newMovie, episodes };
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
}; 