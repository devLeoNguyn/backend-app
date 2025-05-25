const validatePrice = (price) => {
    const validatedPrice = parseInt(price) || 0;
    if (validatedPrice < 0) {
        throw new Error('Price cannot be negative');
    }
    return validatedPrice;
};

const validateEpisodes = (episodes) => {
    if (!Array.isArray(episodes) || episodes.length === 0) {
        throw new Error('Episodes array is required and cannot be empty');
    }

    const episodeNumbers = episodes.map(ep => ep.episode_number);
    const hasValidNumbers = episodeNumbers.every(num => Number.isInteger(num) && num > 0);
    
    if (!hasValidNumbers) {
        throw new Error('episode_number must be positive integers');
    }

    return {
        episodeNumbers,
        maxEpisodeNumber: Math.max(...episodeNumbers)
    };
};

const determineMovieType = (maxEpisodeNumber) => {
    return maxEpisodeNumber > 1 ? 'Phim bộ' : 'Phim lẻ';
};

module.exports = {
    validatePrice,
    validateEpisodes,
    determineMovieType
}; 