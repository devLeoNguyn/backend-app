const Rating = require('../models/Rating');
const Movie = require('../models/Movie');
const mongoose = require('mongoose');

// Import shared utility functions (eliminates duplication)
const { calculateMovieRating } = require('../utils/movieStatsUtils');

// Thêm đánh giá mới
exports.createRating = async (req, res) => {
    try {
        const { movie_id, comment, userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        const rating = await Rating.create({
            user_id,
            movie_id,
            is_like: true,
            comment
        });

        await rating.populate('user_id', 'name email');

        res.status(201).json({
            status: 'success',
            message: 'Đã thêm đánh giá thành công',
            data: { rating }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Bạn đã đánh giá phim này rồi'
            });
        }

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Xóa đánh giá
exports.deleteRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        const rating = await Rating.findOneAndDelete({ _id: id, user_id });

        if (!rating) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy đánh giá hoặc bạn không có quyền xóa'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã xóa đánh giá thành công'
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Lấy danh sách like của một phim
exports.getMovieRatings = async (req, res) => {
    try {
        const { movie_id } = req.params;

        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Lấy tất cả like của phim, sắp xếp theo thời gian mới nhất
        const ratings = await Rating.find({ movie_id })
            .populate('user_id', 'name email')
            .sort({ createdAt: -1 });

        // Đếm tổng số like
        const totalLikes = ratings.length;

        res.json({
            status: 'success',
            data: {
                ratings,
                total_likes: totalLikes
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};
// 🆕 Xóa bình luận của user
exports.deleteUserComment = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        // Tìm rating của user
        const rating = await Rating.findOne({ user_id, movie_id });
        if (!rating) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy bình luận'
            });
        }

        // Xóa bình luận nhưng giữ lại like
        rating.comment = '';
        await rating.save();

        res.json({
            status: 'success',
            message: 'Xóa bình luận thành công'
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ==============================================
// NEW LIKE FUNCTIONS
// ==============================================

// ⚡ UNIFIED TOGGLE LIKE API (RESTful approach)
// PUT /api/ratings/movies/{movie_id}/like
// Body: { "isLike": true/false, "userId": "xxx" }
exports.toggleLike = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { isLike, userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }

        if (typeof isLike !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'isLike phải là boolean (true/false)'
            });
        }
        
        const user_id = userId;

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Find or create rating
        let rating = await Rating.findOne({ user_id, movie_id });
        let isNewRating = false;
        
        if (rating) {
            // Update existing rating
            const previousState = rating.is_like;
            rating.is_like = isLike;
            await rating.save();
            
            // If toggling to false and no comment, remove the rating entirely
            if (!isLike && (!rating.comment || rating.comment.trim() === '')) {
                await Rating.findByIdAndDelete(rating._id);
                rating = null;
            }
        } else if (isLike) {
            // Create new rating only if liking
            rating = await Rating.create({
                user_id,
                movie_id,
                is_like: true
            });
            isNewRating = true;
        }

        // Calculate new like count
        const likeCount = await Rating.countDocuments({ 
            movie_id, 
            is_like: true 
        });

        res.json({
            status: 'success',
            message: isLike ? 'Đã thích phim' : 'Đã bỏ thích phim',
            data: {
                movieId: movie_id,
                isLike,
                likeCount,
                userRating: rating ? {
                    _id: rating._id,
                    isLike: rating.is_like,
                    hasComment: !!(rating.comment && rating.comment.trim()),
                    createdAt: rating.createdAt,
                    updatedAt: rating.updatedAt
                } : null
            }
        });

    } catch (error) {
        console.error('Error in toggleLike:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ==============================================
// LEGACY LIKE FUNCTIONS (for backward compatibility)
// ==============================================

// Like a movie (Legacy)
exports.likeMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        console.log('Debug - movie_id:', movie_id, 'userId:', userId);
        const user_id = userId;

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Create or update rating
        const existingRating = await Rating.findOne({ user_id, movie_id });
        
        if (existingRating) {
            existingRating.is_like = true;
            await existingRating.save();
        } else {
            await Rating.create({
                user_id,
                movie_id,
                is_like: true
            });
        }

        // Get updated stats
        const ratingData = await calculateMovieRating(movie_id);

        res.json({
            status: 'success',
            message: 'Đã thích phim thành công',
            data: {
                movieId: movie_id,
                likeCount: ratingData.likeCount,
                rating: ratingData.rating
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Unlike a movie (Legacy)
exports.unlikeMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        await Rating.findOneAndDelete({ user_id, movie_id });

        // Get updated stats
        const ratingData = await calculateMovieRating(movie_id);

        res.json({
            status: 'success',
            message: 'Đã bỏ thích phim',
            data: {
                movieId: movie_id,
                likeCount: ratingData.likeCount,
                rating: ratingData.rating
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
// COMMENT FUNCTIONS
// ==============================================

// UNIFIED: Add/Update comment to a movie (replaces both addComment and updateUserComment)
exports.addComment = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { comment, userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Bình luận không được để trống'
            });
        }
        // Check if movie exists
        const Movie = require('../models/Movie');
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }
        // Check if user exists
        const User = require('../models/User');
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy người dùng'
            });
        }
        // LUÔN TẠO MỚI bình luận (không update, không kiểm tra tồn tại)
        const newRating = await Rating.create({
            user_id: userId,
            movie_id,
            is_like: false,
            comment: comment.trim()
        });
        await newRating.populate('user_id', 'name email');
        // Console log rõ ràng khi user bình luận
        console.log(`[COMMENT] User ${userId} bình luận phim ${movie_id}: "${comment.trim()}" | _id: ${newRating._id} | createdAt: ${newRating.createdAt}`);
        res.json({
            status: 'success',
            message: 'Đã thêm bình luận thành công',
            data: {
                comment: {
                    _id: newRating._id,
                    user: {
                        _id: newRating.user_id._id,
                        name: newRating.user_id.name || 'Unknown User',
                        email: newRating.user_id.email || 'unknown@email.com'
                    },
                    comment: newRating.comment,
                    createdAt: newRating.createdAt,
                    updatedAt: newRating.updatedAt
                }
            }
        });
    } catch (error) {
        console.error('Error in addComment:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// UNIFIED: Get movie comments with pagination (replaces both getComments and getMovieComments)
exports.getComments = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { page = 1, limit = 10, sort = 'newest', userId } = req.query;
        // Check if movie exists
        const Movie = require('../models/Movie');
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }
        const skip = (page - 1) * limit;
        let sortOption = { createdAt: -1 };
        if (sort === 'oldest') sortOption = { createdAt: 1 };
        // Lọc theo user nếu có userId
        let filter = { movie_id, comment: { $exists: true, $ne: '' } };
        if (userId) filter.user_id = userId;
        // Lấy bình luận với phân trang
        const comments = await Rating.find(filter)
            .populate('user_id', 'name email')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));
        // Console log rõ ràng khi lấy danh sách comment
        console.log(`[COMMENT-GET] Lấy ${comments.length} comment cho phim ${movie_id}${userId ? ` của user ${userId}` : ''}. Các _id: [${comments.map(c => c._id).join(', ')}]`);
        const total = await Rating.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);
        res.json({
            status: 'success',
            data: {
                comments: comments.map(rating => {
                    const user = rating.user_id || {};
                    return {
                        _id: rating._id,
                        user: {
                            _id: user._id || null,
                            name: user.name || 'Unknown User',
                            email: user.email || 'unknown@email.com'
                        },
                        comment: rating.comment,
                        isLike: rating.is_like,
                        createdAt: rating.createdAt,
                        updatedAt: rating.updatedAt
                    };
                }),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalComments: total,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error in getComments:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}; 