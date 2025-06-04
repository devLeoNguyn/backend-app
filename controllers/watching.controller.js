const Watching = require('../models/Watching');
const Episode = require('../models/Episode');
const Movie = require('../models/Movie');
const mongoose = require('mongoose');

// Helper function to calculate view count
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

// UNIFIED: Cập nhật tiến độ xem video
exports.updateWatchProgress = async (req, res) => {
    try {
        // Support both URL params and request body for episode_id
        const episode_id = req.params.episode_id
        const current_time = req.body.current_time
        const user_id = req.user._id;

        // Validate input
        if (!episode_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Episode ID là bắt buộc'
            });
        }

        if (current_time === undefined || current_time < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Thời gian hiện tại không hợp lệ'
            });
        }

        // Sử dụng static method để tìm hoặc tạo watching record
        let watching = await Watching.findOrCreateWatching(user_id, episode_id);
        
        // Sử dụng instance method để cập nhật progress
        await watching.updateProgress(current_time);

        // Return properly formatted response
        res.json({
            status: 'success',
            message: 'Đã cập nhật tiến trình xem thành công',
            data: { 
                watching: {
                    episode_id: watching.episode_id,
                    current_time: watching.current_time,
                    duration: watching.duration,
                    completed: watching.completed,
                    watch_percentage: watching.watch_percentage,
                    last_watched: watching.last_watched
                }
            }
        });

    } catch (error) {
        console.error('Error updating watch progress:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật tiến trình xem',
            error: error.message
        });
    }
};

// Lấy tiến độ xem của user
exports.getWatchProgress = async (req, res) => {
    try {
        const { episodeId } = req.params;
        const userId = req.user._id;

        // Sử dụng query helpers
        const watching = await Watching.findOne()
            .byUser(userId)
            .where({ episode_id: episodeId });

        res.json(watching || { current_time: 0, completed: false });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy danh sách phim đang xem
exports.getContinueWatching = async (req, res) => {
    try {
        const userId = req.user._id;

        // Sử dụng query helpers
        const watching = await Watching.find()
            .byUser(userId)
            .notCompleted()
            .recentlyWatched(10)
            .populate('episode_id', 'episode_number episode_title')
            .populate({
                path: 'episode_id',
                populate: {
                    path: 'movie_id',
                    select: 'movie_title poster_path'
                }
            });

        res.json(watching);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Lấy thống kê xem phim
exports.getWatchingStats = async (req, res) => {
    try {
        const { episodeId } = req.params;
        
        const stats = await Watching.aggregate([
            { 
                $match: { 
                    episode_id: mongoose.Types.ObjectId(episodeId)
                }
            },
            {
                $group: {
                    _id: '$completed',
                    count: { $sum: 1 },
                    avgWatchPercentage: { $avg: '$watch_percentage' }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Bắt đầu xem phim mới
exports.startWatching = async (req, res) => {
    try {
        const { episode_id } = req.body;
        const user_id = req.user._id;

        // Kiểm tra episode có tồn tại không
        const episode = await Episode.findById(episode_id);
        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy tập phim'
            });
        }

        // Sử dụng findOrCreateWatching để tạo hoặc lấy existing record
        const watching = await Watching.findOrCreateWatching(user_id, episode_id);

        // Trả về thông tin watching
        res.status(201).json({
            status: 'success',
            message: 'Đã bắt đầu xem phim',
            data: { watching }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Lấy lịch sử xem của user
exports.getWatchingHistory = async (req, res) => {
    try {
        const user_id = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const watchingHistory = await Watching.find({ user_id })
            .populate({
                path: 'episode_id',
                populate: {
                    path: 'movie_id',
                    select: 'movie_title poster_path movie_type'
                }
            })
            .sort({ last_watched: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Watching.countDocuments({ user_id });

        res.json({
            status: 'success',
            data: {
                watching_history: watchingHistory,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(total / limit),
                    total_items: total
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ==============================================
// VIEW TRACKING FUNCTIONS
// ==============================================

// Add view to a movie (when user completes watching an episode)
exports.addView = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { episode_id, current_time } = req.body;
        const user_id = req.user._id;

        // Check if movie and episode exist
        const [movie, episode] = await Promise.all([
            Movie.findById(movie_id),
            Episode.findById(episode_id)
        ]);

        if (!movie || !episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim hoặc tập phim'
            });
        }

        // Verify that episode belongs to the movie
        if (episode.movie_id.toString() !== movie_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Tập phim không thuộc về phim này'
            });
        }

        // Create or update watching record
        let watching = await Watching.findOrCreateWatching(user_id, episode_id);
        
        // Use updateProgress method to handle completion logic properly
        // If current_time is provided, use it; otherwise assume full duration for manual completion
        const timeToSet = current_time !== undefined ? current_time : episode.duration;
        await watching.updateProgress(timeToSet);

        // Get updated view count
        const viewCount = await calculateViewCount(movie_id);

        res.json({
            status: 'success',
            message: watching.completed ? 'Đã hoàn thành và cập nhật lượt xem' : 'Đã cập nhật tiến trình xem',
            data: {
                movieId: movie_id,
                episodeId: episode_id,
                completed: watching.completed,
                watch_percentage: watching.watch_percentage,
                current_time: watching.current_time,
                viewCount,
                viewCountFormatted: formatViewCount(viewCount)
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get movie view count
exports.getMovieViewCount = async (req, res) => {
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

        const viewCount = await calculateViewCount(movie_id);

        res.json({
            status: 'success',
            data: {
                movieId: movie_id,
                viewCount,
                viewCountFormatted: formatViewCount(viewCount)
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get episode view count
exports.getEpisodeViewCount = async (req, res) => {
    try {
        const { episode_id } = req.params;

        // Check if episode exists
        const episode = await Episode.findById(episode_id).populate('movie_id', 'movie_title');
        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy tập phim'
            });
        }

        // Count completed watching records for this episode
        const viewCount = await Watching.countDocuments({
            episode_id: episode_id,
            completed: true
        });

        res.json({
            status: 'success',
            data: {
                episodeId: episode_id,
                episodeTitle: episode.episode_title,
                episodeNumber: episode.episode_number,
                movieId: episode.movie_id._id,
                movieTitle: episode.movie_id.movie_title,
                viewCount,
                viewCountFormatted: formatViewCount(viewCount)
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all episodes view count for a movie (OPTIMIZED)
exports.getMovieEpisodesViewCount = async (req, res) => {
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

        // OPTIMIZED: Single aggregation query instead of multiple queries
        const episodesWithViews = await Episode.aggregate([
            // Match episodes of this movie
            { $match: { movie_id: new mongoose.Types.ObjectId(movie_id) } },
            
            // Lookup watching records for each episode
            {
                $lookup: {
                    from: 'watchings',
                    let: { episodeId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$episode_id', '$$episodeId'] },
                                        { $eq: ['$completed', true] }
                                    ]
                                }
                            }
                        },
                        { $count: 'viewCount' }
                    ],
                    as: 'watchingStats'
                }
            },
            
            // Project final structure
            {
                $project: {
                    episodeId: '$_id',
                    episodeNumber: 1,
                    episodeTitle: '$episode_title',
                    viewCount: {
                        $ifNull: [{ $arrayElemAt: ['$watchingStats.viewCount', 0] }, 0]
                    }
                }
            },
            
            // Sort by episode number
            { $sort: { episodeNumber: 1 } }
        ]);

        // Add formatted view count and calculate total
        let totalViews = 0;
        const formattedEpisodes = episodesWithViews.map(episode => {
            totalViews += episode.viewCount;
            return {
                ...episode,
                viewCountFormatted: formatViewCount(episode.viewCount)
            };
        });

        res.json({
            status: 'success',
            data: {
                movieId: movie_id,
                movieTitle: movie.movie_title,
                movieType: movie.movie_type,
                totalViews,
                totalViewsFormatted: formatViewCount(totalViews),
                episodes: formattedEpisodes
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 