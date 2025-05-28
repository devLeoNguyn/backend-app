const Rating = require('../models/Rating');
const Movie = require('../models/Movie');

// Thêm đánh giá mới
exports.createRating = async (req, res) => {
    try {
        const { movie_id, star, comment } = req.body;
        const user_id = req.user._id; // Lấy từ middleware auth

        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Validate star rating
        if (star < 1 || star > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Đánh giá sao phải từ 1 đến 5'
            });
        }

        // Tạo đánh giá mới
        const rating = await Rating.create({
            user_id,
            movie_id,
            star,
            comment
        });

        // Populate thông tin user để trả về
        await rating.populate('user_id', 'name email');

        res.status(201).json({
            status: 'success',
            message: 'Đã thêm đánh giá thành công',
            data: { rating }
        });

    } catch (error) {
        // Xử lý lỗi trùng lặp (unique index violation)
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

// Cập nhật đánh giá
exports.updateRating = async (req, res) => {
    try {
        const { id } = req.params;
        const { star, comment } = req.body;
        const user_id = req.user._id;

        // Validate star rating
        if (star && (star < 1 || star > 5)) {
            return res.status(400).json({
                status: 'error',
                message: 'Đánh giá sao phải từ 1 đến 5'
            });
        }

        // Tìm và cập nhật đánh giá
        const rating = await Rating.findOne({ _id: id, user_id });
        
        if (!rating) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa'
            });
        }

        // Cập nhật các trường nếu có
        if (star) rating.star = star;
        if (comment !== undefined) rating.comment = comment;
        
        await rating.save();
        await rating.populate('user_id', 'name email');

        res.json({
            status: 'success',
            message: 'Đã cập nhật đánh giá thành công',
            data: { rating }
        });

    } catch (error) {
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

// Lấy danh sách đánh giá của một phim
exports.getMovieRatings = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Query với pagination
        const ratings = await Rating.find({ movie_id })
            .populate('user_id', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Tính tổng số đánh giá và rating trung bình
        const total = await Rating.countDocuments({ movie_id });
        const averageRating = await Rating.aggregate([
            { $match: { movie_id: movie._id } },
            { $group: { _id: null, average: { $avg: '$star' } } }
        ]);

        const hasMore = total > skip + ratings.length;

        res.json({
            status: 'success',
            data: {
                ratings,
                average_rating: averageRating[0]?.average || 0,
                pagination: {
                    current_page: page,
                    has_more: hasMore,
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