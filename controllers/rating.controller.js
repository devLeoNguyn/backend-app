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

// Like a movie
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

// Unlike a movie
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
        
        const user_id = userId;

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Bình luận không được để trống'
            });
        }

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // 🆕 FIX: Check if user exists
        const User = require('../models/User');
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy người dùng'
            });
        }

        // Create or update rating with comment
        let rating = await Rating.findOne({ user_id, movie_id });
        let isUpdate = !!rating;
        
        if (rating) {
            rating.comment = comment.trim();
            await rating.save();
        } else {
            rating = await Rating.create({
                user_id,
                movie_id,
                is_like: true,
                comment: comment.trim()
            });
        }

        // 🆕 FIX: Safely populate user data with error handling
        try {
            await rating.populate('user_id', 'name email');
        } catch (populateError) {
            console.error('Error populating user data:', populateError);
            // Fallback: use the user data we already have
            rating.user_id = user;
        }

        // 🆕 FIX: Safe access to user properties
        const userData = rating.user_id || user;
        if (!userData) {
            return res.status(500).json({
                status: 'error',
                message: 'Lỗi không thể lấy thông tin người dùng'
            });
        }

        const message = isUpdate ? 'Đã cập nhật bình luận thành công' : 'Đã thêm bình luận thành công';

        res.json({
            status: 'success',
            message,
            data: {
                movieId: movie_id,
                rating: {
                    _id: rating._id,
                    user: {
                        _id: userData._id,
                        name: userData.name || 'Unknown User',
                        email: userData.email || 'unknown@email.com'
                    },
                    comment: rating.comment,
                    isLike: rating.is_like,
                    createdAt: rating.createdAt,
                    updatedAt: rating.updatedAt
                }
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Bạn đã đánh giá phim này rồi'
            });
        }
        
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
        const { page = 1, limit = 10, sort = 'newest' } = req.query;

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Calculate skip for pagination
        const skip = (page - 1) * limit;

        // Determine sort option
        let sortOption = { createdAt: -1 }; // Default newest
        if (sort === 'oldest') {
            sortOption = { createdAt: 1 };
        } else if (sort === 'most_liked') {
            sortOption = { createdAt: -1 }; // Can be enhanced with like_count in future
        }

        // Get comments with pagination
        const comments = await Rating.find({ 
            movie_id, 
            comment: { $exists: true, $ne: '' } 
        })
            .populate('user_id', 'name email')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Rating.countDocuments({ 
            movie_id, 
            comment: { $exists: true, $ne: '' } 
        });

        const totalPages = Math.ceil(total / limit);

        res.json({
            status: 'success',
            data: {
                comments: comments.map(rating => {
                    // 🆕 FIX: Safe access to user properties
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