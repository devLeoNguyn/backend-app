const Rating = require('../models/Rating');
const Movie = require('../models/Movie');
const mongoose = require('mongoose');

// Helper function to calculate movie rating
const calculateMovieRating = async (movieId) => {
    try {
        const ratingStats = await Rating.aggregate([
            { $match: { movie_id: mongoose.Types.ObjectId(movieId) } },
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

// Thêm đánh giá mới
exports.createRating = async (req, res) => {
    try {
        const { movie_id, comment } = req.body;
        const user_id = req.user._id;

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
        const user_id = req.user._id;

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

// ==============================================
// NEW LIKE FUNCTIONS
// ==============================================

// Like a movie
exports.likeMovie = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const user_id = req.user._id;

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
        const user_id = req.user._id;

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

// Add comment to a movie
exports.addComment = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { comment } = req.body;
        const user_id = req.user._id;

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

        // Create or update rating with comment
        let rating = await Rating.findOne({ user_id, movie_id });
        
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

        await rating.populate('user_id', 'name email');

        res.json({
            status: 'success',
            message: 'Đã thêm bình luận thành công',
            data: {
                movieId: movie_id,
                comment: {
                    id: rating._id,
                    comment: rating.comment,
                    user: rating.user_id,
                    createdAt: rating.createdAt
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

// Get movie comments
exports.getComments = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Check if movie exists
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Get comments with pagination
        const comments = await Rating.find({ 
            movie_id, 
            comment: { $exists: true, $ne: '' } 
        })
            .populate('user_id', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Rating.countDocuments({ 
            movie_id, 
            comment: { $exists: true, $ne: '' } 
        });

        res.json({
            status: 'success',
            data: {
                comments: comments.map(rating => ({
                    id: rating._id,
                    comment: rating.comment,
                    user: rating.user_id,
                    createdAt: rating.createdAt
                })),
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalComments: total,
                    hasMore: total > skip + comments.length
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