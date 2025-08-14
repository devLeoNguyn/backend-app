const Rating = require('../models/Rating');
const Watching = require('../models/Watching');
const Episode = require('../models/Episode');
const mongoose = require('mongoose');

// ===================================================
// SHARED HELPER FUNCTIONS (used across multiple controllers)
// ===================================================

/**
 * Format remaining time for UI display
 * Used by: home.controller.js, watching.controller.js
 */
const formatRemainingTime = (remainingTime) => {
    const remainingMinutes = Math.ceil(remainingTime / 60);
    if (remainingMinutes < 60) {
        return `${remainingMinutes} phút còn lại`;
    } else {
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        if (minutes === 0) {
            return `${hours} giờ còn lại`;
        } else {
            return `${hours}g ${minutes}p còn lại`;
        }
    }
};

/**
 * Calculate movie rating statistics
 * Used by: movie.controller.js, rating.controller.js, home.controller.js
 */
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

/**
 * Calculate movie view count
 * Used by: movie.controller.js, watching.controller.js
 */
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

/**
 * Calculate unique movie view count (improved)
 * Only counts unique users who completed watching
 */
const calculateUniqueViewCount = async (movieId) => {
    try {
        const episodes = await Episode.find({ movie_id: movieId }).select('_id');
        const episodeIds = episodes.map(ep => ep._id);

        // Count unique users who completed watching any episode of this movie
        const uniqueViewCount = await Watching.aggregate([
            {
                $match: {
                    episode_id: { $in: episodeIds },
                    completed: true
                }
            },
            {
                $group: {
                    _id: '$user_id',
                    count: { $sum: 1 }
                }
            },
            {
                $count: 'uniqueUsers'
            }
        ]);

        return uniqueViewCount[0]?.uniqueUsers || 0;
    } catch (error) {
        console.error('Error calculating unique view count:', error);
        return 0;
    }
};

/**
 * Calculate total episode completions (for detailed stats)
 */
const calculateTotalEpisodeCompletions = async (movieId) => {
    try {
        const episodes = await Episode.find({ movie_id: movieId }).select('_id');
        const episodeIds = episodes.map(ep => ep._id);

        return await Watching.countDocuments({
            episode_id: { $in: episodeIds },
            completed: true
        });
    } catch (error) {
        console.error('Error calculating total completions:', error);
        return 0;
    }
};

/**
 * Format view count for UI display
 * Used by: movie.controller.js, watching.controller.js
 */
const formatViewCount = (count) => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(0) + 'k';
    }
    return count.toString();
};

/**
 * Calculate movie comment count
 * Used by: movie.controller.js, rating.controller.js
 */
const calculateCommentCount = async (movieId) => {
    try {
        const commentCount = await Rating.countDocuments({ 
            movie_id: movieId, 
            comment: { $exists: true, $ne: '' } 
        });
        return commentCount;
    } catch (error) {
        console.error('Error calculating comment count:', error);
        return 0;
    }
};

/**
 * Get comprehensive movie statistics (simplified)
 * Used by: movie.controller.js
 */
const getMovieStatistics = async (movieId) => {
    try {
        const [ratingData, viewCount, commentCount] = await Promise.all([
            calculateMovieRating(movieId),
            calculateTotalEpisodeCompletions(movieId), // Use total completions as main view count
            calculateCommentCount(movieId)
        ]);

        return {
            likes: ratingData.likeCount,
            rating: ratingData.rating,
            totalRatings: ratingData.totalRatings,
            views: viewCount, // Total completions (includes re-watches)
            viewsFormatted: formatViewCount(viewCount),
            comments: commentCount
        };
    } catch (error) {
        console.error('Error getting movie statistics:', error);
        return {
            likes: 0,
            rating: 0,
            totalRatings: 0,
            views: 0,
            viewsFormatted: '0',
            comments: 0
        };
    }
};

module.exports = {
    calculateMovieRating,
    calculateViewCount, // Keep for backward compatibility
    calculateUniqueViewCount, // New: for accurate unique user count
    calculateTotalEpisodeCompletions, // New: for total completions
    formatViewCount,
    calculateCommentCount,
    getMovieStatistics,
    formatRemainingTime
}; 