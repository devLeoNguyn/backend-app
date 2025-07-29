const Favorite = require('../models/Favorite');
const Movie = require('../models/Movie');

// ==============================================
// NEW UNIFIED FAVORITE API (RESTful approach)
// ==============================================

// ⚡ UNIFIED TOGGLE FAVORITE API
// PUT /api/favorites/movies/{movie_id}
// Body: { "isFavorite": true/false, "userId": "xxx" }
exports.toggleFavorite = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { isFavorite, userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }

        if (typeof isFavorite !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'isFavorite phải là boolean (true/false)'
            });
        }
        
        const user_id = userId;

        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Tìm favorite hiện tại
        const existingFavorite = await Favorite.findOne({ user_id, movie_id });

        if (isFavorite) {
            // Thêm vào favorites
            if (!existingFavorite) {
                const favorite = await Favorite.create({
                    user_id,
                    movie_id
                });

                return res.json({
                    status: 'success',
                    message: 'Đã thêm phim vào danh sách yêu thích',
                    data: {
                        movieId: movie_id,
                        isFavorite: true,
                        favoriteId: favorite._id,
                        addedAt: favorite.added_at
                    }
                });
            } else {
                // Đã có trong favorites
                return res.json({
                    status: 'success',
                    message: 'Phim đã có trong danh sách yêu thích',
                    data: {
                        movieId: movie_id,
                        isFavorite: true,
                        favoriteId: existingFavorite._id,
                        addedAt: existingFavorite.added_at
                    }
                });
            }
        } else {
            // Xóa khỏi favorites
            if (existingFavorite) {
                await Favorite.findByIdAndDelete(existingFavorite._id);
                
                return res.json({
                    status: 'success',
                    message: 'Đã xóa phim khỏi danh sách yêu thích',
                    data: {
                        movieId: movie_id,
                        isFavorite: false
                    }
                });
            } else {
                // Không có trong favorites
                return res.json({
                    status: 'success',
                    message: 'Phim không có trong danh sách yêu thích',
                    data: {
                        movieId: movie_id,
                        isFavorite: false
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error in toggleFavorite:', error);
        
        // Xử lý lỗi trùng lặp (unique index violation)
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Phim đã có trong danh sách yêu thích'
            });
        }

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// ==============================================
// LEGACY FAVORITE FUNCTIONS (for backward compatibility)
// ==============================================

// Thêm phim vào danh sách yêu thích
exports.addToFavorites = async (req, res) => {
    try {
        const { movie_id, userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        // Kiểm tra phim có tồn tại không
        const movie = await Movie.findById(movie_id);
        if (!movie) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim'
            });
        }

        // Thêm vào danh sách yêu thích
        const favorite = await Favorite.create({
            user_id,
            movie_id
        });

        res.status(201).json({
            status: 'success',
            message: 'Đã thêm phim vào danh sách yêu thích',
            data: { favorite }
        });
    } catch (error) {
        // Xử lý lỗi trùng lặp (unique index violation)
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Phim đã có trong danh sách yêu thích'
            });
        }

        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Lấy danh sách phim yêu thích của user
exports.getFavorites = async (req, res) => {
    try {
        const { userId } = req.query;
        
        console.log('📊 [getFavorites] Request:', { userId, query: req.query });
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;
        
        // Pagination cho mobile (default 10 items/page)
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Query với pagination
        const favorites = await Favorite.find({ user_id })
            .populate({
                path: 'movie_id',
                select: 'movie_title description production_time producer movie_type price is_free price_display poster_path genres',
                populate: {
                    path: 'genres',
                    select: 'genre_name'
                }
            })
            .sort({ added_at: -1 })
            .skip(skip)
            .limit(limit);

        // Filter out favorites where movie_id is null (deleted movies)
        const validFavorites = favorites.filter(fav => fav.movie_id !== null);

        // Đếm tổng số item để check còn data không
        const total = await Favorite.countDocuments({ user_id });
        const hasMore = total > skip + validFavorites.length;
        
        console.log('📊 [getFavorites] Query results:', {
            totalFavorites: favorites.length,
            validFavorites: validFavorites.length,
            total,
            hasMore
        });

        // Format response phù hợp cho mobile
        const formattedFavorites = validFavorites.map(fav => ({
            _id: fav.movie_id._id,
            movie_title: fav.movie_id.movie_title,
            description: fav.movie_id.description,
            production_time: fav.movie_id.production_time,
            producer: fav.movie_id.producer,
            movie_type: fav.movie_id.movie_type,
            price: fav.movie_id.price,
            is_free: fav.movie_id.is_free,
            price_display: fav.movie_id.price_display,
            poster_path: fav.movie_id.poster_path,
            genres: fav.movie_id.genres?.map(genre => genre.genre_name) || [],
            added_at: fav.added_at
        }));

        res.json({
            status: 'success',
            data: {
                favorites: formattedFavorites,
                pagination: {
                    current_page: page,
                    has_more: hasMore,
                    total_items: total
                }
            }
        });
    } catch (error) {
        console.error('❌ [getFavorites] Error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        });
    }
};

// Xóa phim khỏi danh sách yêu thích
exports.removeFromFavorites = async (req, res) => {
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

        const result = await Favorite.findOneAndDelete({
            user_id,
            movie_id
        });

        if (!result) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy phim trong danh sách yêu thích'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã xóa phim khỏi danh sách yêu thích'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Kiểm tra phim có trong danh sách yêu thích không
exports.checkFavorite = async (req, res) => {
    try {
        const { movie_id } = req.params;
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }
        
        const user_id = userId;

        const favorite = await Favorite.findOne({
            user_id,
            movie_id
        });

        res.json({
            status: 'success',
            data: {
                is_favorite: !!favorite
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Thêm phim vào danh sách 'xem sau' (watch later) - tạo bản ghi Favorite riêng
exports.addToWatchLater = async (req, res) => {
    try {
        const { userId, movieId } = req.body;
        if (!userId || !movieId) return res.status(400).json({ status: 'error', message: 'userId và movieId là bắt buộc' });
        // Tạo bản ghi Favorite mới cho phim xem sau
        const exists = await Favorite.findOne({ user_id: userId, movie_id: movieId });
        if (exists) {
            return res.status(400).json({ status: 'error', message: 'Phim đã có trong danh sách xem sau hoặc yêu thích' });
        }
        const doc = await Favorite.create({ user_id: userId, movie_id: movieId });
        res.json({ status: 'success', data: doc });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Lấy toàn bộ danh sách phim 'xem sau' của user (lấy tất cả bản ghi Favorite của user)
exports.getWatchLater = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ status: 'error', message: 'userId là bắt buộc' });
        const list = await Favorite.find({ user_id: userId }).populate('movie_id');
        res.json({ status: 'success', data: list });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// Xóa phim khỏi danh sách 'xem sau' (xóa bản ghi Favorite theo user_id và movie_id)
exports.removeFromWatchLater = async (req, res) => {
    try {
        const { userId, movieId } = req.body;
        if (!userId || !movieId) return res.status(400).json({ status: 'error', message: 'userId và movieId là bắt buộc' });
        const result = await Favorite.findOneAndDelete({ user_id: userId, movie_id: movieId });
        if (!result) {
            return res.status(404).json({ status: 'error', message: 'Không tìm thấy phim trong danh sách xem sau' });
        }
        res.json({ status: 'success', message: 'Đã xóa phim khỏi danh sách xem sau' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
}; 