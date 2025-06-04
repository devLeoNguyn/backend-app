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

// Validation cho Sports Events
const validateSportsEvent = (movieData) => {
    const { movie_type, event_start_time, event_status } = movieData;
    
    // Chỉ validate khi là thể thao
    if (movie_type !== 'Thể thao') {
        return movieData;
    }
    
    // Validate event_start_time - bắt buộc cho sự kiện thể thao
    if (!event_start_time) {
        throw new Error('event_start_time is required for sports events');
    }
    
    const startTime = new Date(event_start_time);
    if (isNaN(startTime.getTime())) {
        throw new Error('event_start_time must be a valid date');
    }
    
    // Validate event_status
    const validStatuses = ['upcoming', 'ended'];
    if (event_status && !validStatuses.includes(event_status)) {
        throw new Error('event_status must be either "upcoming" or "ended"');
    }
    
    // Tự động xác định event_status nếu không có
    const now = new Date();
    const autoStatus = startTime > now ? 'upcoming' : 'ended';
    
    return {
        ...movieData,
        event_start_time: startTime,
        event_status: event_status || autoStatus,
        // Sports events mặc định có 1 episode (trận đấu)
        total_episodes: 1,
        movie_type: 'Thể thao'
    };
};

// Validation cho episodes của sports events
const validateSportsEpisodes = (episodes, movieType) => {
    if (movieType !== 'Thể thao') {
        return validateEpisodes(episodes);
    }
    
    // Sports events chỉ có 1 episode (trận đấu)
    if (!Array.isArray(episodes) || episodes.length !== 1) {
        throw new Error('Sports events must have exactly 1 episode (the match/event)');
    }
    
    const episode = episodes[0];
    if (!episode.episode_title || !episode.uri) {
        throw new Error('Sports episode must have episode_title and uri');
    }
    
    // Đảm bảo episode_number = 1 cho sports
    return {
        episodeNumbers: [1],
        maxEpisodeNumber: 1
    };
};

// Comprehensive validation cho tất cả movie types
const validateMovieData = (movieData) => {
    const { movie_type } = movieData;
    
    if (!movie_type) {
        throw new Error('movie_type is required');
    }
    
    const validTypes = ['Phim bộ', 'Phim lẻ', 'Thể thao'];
    if (!validTypes.includes(movie_type)) {
        throw new Error('movie_type must be one of: Phim bộ, Phim lẻ, Thể thao');
    }
    
    // Validate price
    const validatedPrice = validatePrice(movieData.price);
    
    // Xử lý riêng cho sports events
    if (movie_type === 'Thể thao') {
        const validatedSports = validateSportsEvent(movieData);
        const { maxEpisodeNumber } = validateSportsEpisodes(movieData.episodes, movie_type);
        
        return {
            ...validatedSports,
            price: validatedPrice,
            maxEpisodeNumber
        };
    }
    
    // Xử lý cho phim thường
    const { maxEpisodeNumber } = validateEpisodes(movieData.episodes);
    const determinedType = determineMovieType(maxEpisodeNumber);
    
    return {
        ...movieData,
        price: validatedPrice,
        movie_type: determinedType,
        maxEpisodeNumber
    };
};

module.exports = {
    validatePrice,
    validateEpisodes,
    determineMovieType,
    validateSportsEvent,
    validateSportsEpisodes,
    validateMovieData
}; 