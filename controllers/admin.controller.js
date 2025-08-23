const User = require('../models/User');
const Movie = require('../models/Movie');
const MovieRental = require('../models/MovieRental');
const MoviePayment = require('../models/MoviePayment');
const Genre = require('../models/Genre');
const mongoose = require('mongoose');

class AdminController {
    
    // GET /api/admin/dashboard/overview
    async getDashboardOverview(req, res) {
        try {
            const [totalUsers, totalMovies, totalRevenue, activeRentals] = await Promise.all([
                User.countDocuments(),
                Movie.countDocuments(),
                MovieRental.aggregate([
                    { $match: { status: 'active' } },
                    { $lookup: { from: 'moviepayments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
                    { $unwind: '$payment' },
                    { $group: { _id: null, total: { $sum: '$payment.amount' } } }
                ]),
                MovieRental.countDocuments({ status: 'active' })
            ]);

            res.json({
                status: 'success',
                data: {
                    totalUsers,
                    totalMovies,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    activeRentals
                }
            });
        } catch (error) {
            console.error('Dashboard overview error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/users - Format theo admin template với pagination
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 20, search } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            
            const query = search ? {
                $or: [
                    { full_name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            } : {};

            const users = await User.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip((pageNum - 1) * limitNum);

            const total = await User.countDocuments(query);

            // Map to admin template format
            const formattedUsers = users.map(user => {
                // Xử lý an toàn full_name có thể null/undefined
                const fullName = user.full_name || user.email || 'Người dùng';
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // Xử lý an toàn createdAt
                const createdAtDate = user.createdAt ? user.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

                return {
                    id: user._id,
                    firstName: firstName,
                    lastName: lastName,
                    email: user.email,
                    phone: user.phone,
                    createdAt: createdAtDate,
                    verified: user.is_phone_verified,
                    img: user.avatar || '/default-avatar.png',
                    // Thêm thông tin chi tiết
                    fullName: fullName,
                    role: user.role,
                    gender: user.gender,
                    dateOfBirth: user.date_of_birth,
                    address: user.address,
                    lastLogin: user.last_login,
                    isActive: user.is_active !== false,
                    isLocked: user.is_locked === true,
                    joinedDate: createdAtDate,
                    totalRentals: 0 // Sẽ được populate sau
                };
            });

            res.json({
                users: formattedUsers,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(total / limitNum),
                    totalUsers: total,
                    pageSize: limitNum,
                    hasNext: pageNum < Math.ceil(total / limitNum),
                    hasPrev: pageNum > 1
                }
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/users/:id - Get single user
    async getUserDetail(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findById(id);
            
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Format theo admin template
            const formattedUser = {
                id: user._id,
                firstName: user.full_name.split(' ')[0],
                lastName: user.full_name.split(' ').slice(1).join(' '),
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt.toISOString().split('T')[0],
                verified: user.is_phone_verified,
                img: user.avatar || '/default-avatar.png',
                role: user.role,
                gender: user.gender,
                isLocked: user.is_locked === true
            };

            res.json(formattedUser);
        } catch (error) {
            console.error('Get user detail error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/movies - Map movies thành products format
    async getAllMovies(req, res) {
        try {
            const { page = 1, limit = 100 } = req.query; // Tăng limit mặc định
            
            const movies = await Movie.find()
                .populate('genres', 'genre_name')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            const totalMovies = await Movie.countDocuments();

            // Map to admin template products format
            const formattedMovies = movies.map(movie => ({
                id: movie._id,
                title: movie.movie_title,
                genre: movie.genres[0]?.genre_name || 'Chưa phân loại',
                producer: movie.producer,
                price: movie.price || 0,
                createdAt: movie.createdAt.toISOString().split('T')[0],
                inStock: movie.release_status === 'released',
                img: movie.poster_path,
                // Thêm thông tin chi tiết
                description: movie.description,
                duration: movie.duration,
                rating: movie.rating,
                country: movie.country,
                releaseYear: movie.release_year,
                totalEpisodes: movie.total_episodes,
                movieType: movie.movie_type,
                status: movie.release_status
            }));

            res.json({
                data: formattedMovies,
                total: totalMovies,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalMovies / parseInt(limit))
            });
        } catch (error) {
            console.error('Get all movies error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/rentals - Map rentals thành orders format
    async getAllRentals(req, res) {
        try {
            const rentals = await MovieRental.find()
                .populate('userId', 'full_name email')
                .populate('movieId', 'movie_title')
                .populate('paymentId', 'amount')
                .sort({ createdAt: -1 })
                .limit(50);

            // Map to admin template orders format
            const formattedRentals = rentals.map(rental => ({
                id: rental._id,
                userId: rental.userId?._id,
                customerName: rental.userId?.full_name,
                email: rental.userId?.email,
                movieTitle: rental.movieId?.movie_title,
                amount: rental.paymentId?.amount || 0,
                status: rental.status,
                createdAt: rental.createdAt.toISOString().split('T')[0],
                // Thêm thông tin chi tiết
                movieId: rental.movieId?._id,
                paymentId: rental.paymentId?._id,
                rentalType: rental.rentalType,
                remainingTime: rental.remainingTime,
                isExpired: rental.status === 'expired',
                paymentMethod: rental.paymentId?.paymentMethod || 'PayOS',
                transactionId: rental.paymentId?.transactionId
            }));

            res.json(formattedRentals);
        } catch (error) {
            console.error('Get all rentals error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/analytics/charts
    async getAnalyticsData(req, res) {
        try {
            // User growth by month
            const userGrowth = await User.aggregate([
                {
                    $group: {
                        _id: { 
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ]);

            // Revenue by month
            const revenueGrowth = await MovieRental.aggregate([
                { $match: { status: { $in: ['active', 'expired'] } } },
                {
                    $lookup: {
                        from: 'moviepayments',
                        localField: 'paymentId', 
                        foreignField: '_id',
                        as: 'payment'
                    }
                },
                { $unwind: '$payment' },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        revenue: { $sum: '$payment.amount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ]);

            // Genre distribution
            const genreStats = await Movie.aggregate([
                { $unwind: '$genres' },
                {
                    $lookup: {
                        from: 'genres',
                        localField: 'genres',
                        foreignField: '_id',
                        as: 'genre'
                    }
                },
                { $unwind: '$genre' },
                {
                    $group: {
                        _id: '$genre.name',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            res.json({
                userGrowth: userGrowth.map(item => ({
                    name: `${item._id.month}/${item._id.year}`,
                    users: item.count
                })),
                revenueGrowth: revenueGrowth.map(item => ({
                    name: `${item._id.month}/${item._id.year}`,
                    revenue: item.revenue
                })),
                genreDistribution: genreStats.map(item => ({
                    name: item._id,
                    value: item.count
                }))
            });
        } catch (error) {
            console.error('Get analytics data error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Additional methods for admin template compatibility

    // GET /api/admin/totalusers - Format for admin template charts
    async getTotalUsers(req, res) {
        try {
            const total = await User.countDocuments();
            const recentGrowth = await User.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
            });
            
            res.json({
                number: total,
                percentage: recentGrowth > 0 ? 12 : 0,
                chartData: [] // Add chart data later
            });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/totalproducts - Format for admin template charts
    async getTotalProducts(req, res) {
        try {
            const total = await Movie.countDocuments();
            const recentGrowth = await Movie.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
            });
            
            res.json({
                number: total,
                percentage: recentGrowth > 0 ? 8 : 0,
                chartData: []
            });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/totalrevenue - Format for admin template charts
    async getTotalRevenue(req, res) {
        try {
            // Lấy doanh thu của năm hiện tại
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1); // 1/1/2025
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59); // 31/12/2025
            
            const totalRevenue = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: startOfYear,
                            $lte: endOfYear
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]);
            
            res.json({
                number: totalRevenue[0]?.total || 0,
                percentage: 15,
                chartData: []
            });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // Get system status and service health
    async getSystemStatus(req, res) {
        try {
            const { adminUserId } = req.query;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error', 
                    message: 'Admin access required'
                });
            }

            // Check service configurations
            const serviceStatus = {
                database: {
                    status: 'connected',
                    connection: process.env.MONGO_URI ? 'configured' : 'missing'
                },
                cloudflare: {
                    status: process.env.CLOUDFLARE_API_TOKEN ? 'configured' : 'missing',
                    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ? 'set' : 'missing',
                    accountHash: process.env.CLOUDFLARE_ACCOUNT_HASH ? 'set' : 'missing'
                },
                payment: {
                    payos: {
                        status: process.env.PAYOS_API_KEY ? 'configured' : 'missing',
                        clientId: process.env.PAYOS_CLIENT_ID ? 'set' : 'missing',
                        returnUrl: process.env.PAYOS_RETURN_URL || 'not set',
                        cancelUrl: process.env.PAYOS_CANCEL_URL || 'not set'
                    }
                },
                sms: {
                    esms: {
                        status: process.env.ESMS_API_KEY ? 'configured' : 'missing',
                        secretKey: process.env.ESMS_SECRET_KEY ? 'set' : 'missing'
                    }
                },
                jwt: {
                    secret: process.env.JWT_SECRET ? 'configured' : 'missing',
                    refreshSecret: process.env.JWT_REFRESH_SECRET ? 'configured' : 'missing',
                    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
                    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
                }
            };

            // Get database stats
            const dbStats = await mongoose.connection.db.stats();
            
            res.json({
                status: 'success',
                data: {
                    services: serviceStatus,
                    database: {
                        name: mongoose.connection.name,
                        collections: dbStats.collections,
                        dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
                        storageSize: `${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`,
                        indexes: dbStats.indexes
                    },
                    environment: process.env.NODE_ENV || 'development',
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('System status error:', error);
            res.status(500).json({ 
                status: 'error', 
                message: error.message 
            });
        }
    }

    // ============================================================================
    // GENRE CRUD OPERATIONS
    // ============================================================================

    // GET /api/admin/genres - Lấy tất cả genres
    async getAllGenres(req, res) {
        try {
            const { adminUserId } = req.query;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const genres = await Genre.find()
                .populate('parent_genre', 'genre_name')
                .sort({ sort_order: 1, genre_name: 1 });

            // Get movie count for each genre
            const genresWithStats = await Promise.all(
                genres.map(async (genre) => {
                    const movieCount = await Movie.countDocuments({ 
                        genres: genre._id 
                    });

                    return {
                        id: genre._id,
                        genre_name: genre.genre_name,
                        description: genre.description,
                        poster: genre.poster,
                        parent_genre: genre.parent_genre,
                        is_parent: genre.is_parent,
                        is_active: genre.is_active,
                        sort_order: genre.sort_order,
                        movie_count: movieCount,
                        createdAt: genre.createdAt.toISOString().split('T')[0],
                        updatedAt: genre.updatedAt.toISOString().split('T')[0]
                    };
                })
            );

            res.json(genresWithStats);
        } catch (error) {
            console.error('Get all genres error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // POST /api/admin/genres - Tạo genre mới
    async createGenre(req, res) {
        try {
            const { adminUserId } = req.query;
            const { genre_name, description, poster, parent_genre_id, sort_order } = req.body;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            // Check if genre already exists
            const existingGenre = await Genre.findOne({
                genre_name: { $regex: new RegExp(`^${genre_name}$`, 'i') }
            });

            if (existingGenre) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Genre với tên này đã tồn tại'
                });
            }

            const newGenre = new Genre({
                genre_name: genre_name.trim(),
                description: description?.trim(),
                poster: poster?.trim(),
                parent_genre: parent_genre_id || null,
                is_parent: !parent_genre_id,
                sort_order: sort_order || 999,
                is_active: true
            });

            await newGenre.save();
            await newGenre.populate('parent_genre', 'genre_name description');

            res.status(201).json({
                status: 'success',
                message: 'Tạo genre thành công',
                data: { genre: newGenre }
            });
        } catch (error) {
            console.error('Create genre error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // PUT /api/admin/genres/:id - Cập nhật genre
    async updateGenre(req, res) {
        try {
            const { adminUserId } = req.query;
            const { id } = req.params;
            const { genre_name, description, poster, sort_order } = req.body;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const updatedGenre = await Genre.findByIdAndUpdate(
                id,
                {
                    genre_name,
                    description,
                    poster,
                    sort_order
                },
                { new: true }
            ).populate('parent_genre', 'genre_name description');

            if (!updatedGenre) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Genre không tồn tại'
                });
            }

            res.json({
                status: 'success',
                message: 'Cập nhật genre thành công',
                data: { genre: updatedGenre }
            });
        } catch (error) {
            console.error('Update genre error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // DELETE /api/admin/genres/:id - Xóa genre
    async deleteGenre(req, res) {
        try {
            const { adminUserId } = req.query;
            const { id } = req.params;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            // Check if genre is being used by any movies
            const movieCount = await Movie.countDocuments({ genres: id });
            if (movieCount > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: `Không thể xóa genre này vì đang được sử dụng bởi ${movieCount} phim`
                });
            }

            const deletedGenre = await Genre.findByIdAndDelete(id);
            if (!deletedGenre) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Genre không tồn tại'
                });
            }

            res.json({
                status: 'success',
                message: 'Xóa genre thành công'
            });
        } catch (error) {
            console.error('Delete genre error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // PUT /api/admin/genres/:id/status - Cập nhật trạng thái genre
    async updateGenreStatus(req, res) {
        try {
            const { adminUserId } = req.query;
            const { id } = req.params;
            const { action } = req.body; // 'activate' or 'deactivate'
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const is_active = action === 'activate';
            const updatedGenre = await Genre.findByIdAndUpdate(
                id,
                { is_active },
                { new: true }
            );

            if (!updatedGenre) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Genre không tồn tại'
                });
            }

            res.json({
                status: 'success',
                message: `${action === 'activate' ? 'Kích hoạt' : 'Vô hiệu hóa'} genre thành công`,
                data: { genre: updatedGenre }
            });
        } catch (error) {
            console.error('Update genre status error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // ============================================================================
    // WEBSOCKET MANAGEMENT
    // ============================================================================

    // GET /api/admin/websocket/connections - Lấy thông tin WebSocket connections
    async getWebSocketConnections(req, res) {
        try {
            const { adminUserId } = req.query;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const webSocketService = require('../services/websocket.service');
            const connectionInfo = webSocketService.getConnectionInfo();

            res.json({
                status: 'success',
                message: 'Lấy thông tin WebSocket connections thành công',
                data: connectionInfo
            });
        } catch (error) {
            console.error('Get WebSocket connections error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // ============================================================================
    // EPISODE MANAGEMENT SYSTEM
    // ============================================================================

    // GET /api/admin/episodes - Lấy danh sách episodes theo movieId
    async getEpisodesByMovie(req, res) {
        try {
            const { adminUserId, movieId } = req.query;
            const { page = 1, limit = 20 } = req.query;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            if (!movieId) {
                return res.status(400).json({
                    status: 'error',
                    message: 'movieId is required'
                });
            }

            // Verify movie exists
            const movie = await Movie.findById(movieId);
            if (!movie) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Movie not found'
                });
            }

            // Get episodes with pagination
            const Episode = require('../models/Episode');
            const episodes = await Episode.find({ movie_id: movieId })
                .sort({ episode_number: 1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Episode.countDocuments({ movie_id: movieId });

            // Format episodes for admin interface
            const formattedEpisodes = episodes.map(episode => ({
                id: episode._id,
                episode_title: episode.episode_title,
                episode_number: episode.episode_number,
                episode_description: episode.episode_description,
                uri: episode.uri,
                duration: episode.duration,
                createdAt: episode.createdAt.toISOString().split('T')[0],
                updatedAt: episode.updatedAt.toISOString().split('T')[0],
                movie_id: episode.movie_id,
                movie_title: movie.movie_title
            }));

            res.json({
                status: 'success',
                message: 'Episodes retrieved successfully',
                data: {
                    episodes: formattedEpisodes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    },
                    movie: {
                        id: movie._id,
                        title: movie.movie_title,
                        total_episodes: movie.total_episodes
                    }
                }
            });
        } catch (error) {
            console.error('Get episodes by movie error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // POST /api/admin/episodes - Tạo episode mới
    async createEpisode(req, res) {
        try {
            const { adminUserId } = req.query;
            const { 
                episode_title, 
                episode_number, 
                episode_description, 
                movie_id, 
                duration = 120,
                uri = 'pending-upload'
            } = req.body;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            // Validate required fields
            if (!episode_title || !episode_number || !movie_id) {
                return res.status(400).json({
                    status: 'error',
                    message: 'episode_title, episode_number, and movie_id are required'
                });
            }

            // Verify movie exists
            const movie = await Movie.findById(movie_id);
            if (!movie) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Movie not found'
                });
            }

            // Check if episode number already exists for this movie
            const Episode = require('../models/Episode');
            const existingEpisode = await Episode.findOne({ 
                movie_id, 
                episode_number 
            });

            if (existingEpisode) {
                return res.status(400).json({
                    status: 'error',
                    message: `Episode ${episode_number} already exists for this movie`
                });
            }

            // Create new episode
            const newEpisode = new Episode({
                episode_title,
                episode_number,
                episode_description,
                movie_id,
                duration,
                uri
            });

            await newEpisode.save();

            // Update movie's total episodes count if needed
            const totalEpisodes = await Episode.countDocuments({ movie_id });
            if (totalEpisodes > movie.total_episodes) {
                await Movie.findByIdAndUpdate(movie_id, { 
                    total_episodes: totalEpisodes 
                });
            }

            res.status(201).json({
                status: 'success',
                message: 'Episode created successfully',
                data: { episode: newEpisode }
            });
        } catch (error) {
            console.error('Create episode error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // PUT /api/admin/episodes/:id - Cập nhật episode
    async updateEpisode(req, res) {
        try {
            const { adminUserId } = req.query;
            const { id } = req.params;
            const { 
                episode_title, 
                episode_number, 
                episode_description, 
                duration,
                uri
            } = req.body;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const Episode = require('../models/Episode');
            const episode = await Episode.findById(id);
            if (!episode) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Episode not found'
                });
            }

            // Check if new episode number conflicts with existing episodes
            if (episode_number && episode_number !== episode.episode_number) {
                const existingEpisode = await Episode.findOne({ 
                    movie_id: episode.movie_id, 
                    episode_number,
                    _id: { $ne: id }
                });

                if (existingEpisode) {
                    return res.status(400).json({
                        status: 'error',
                        message: `Episode ${episode_number} already exists for this movie`
                    });
                }
            }

            // Update episode
            const updateData = {};
            if (episode_title) updateData.episode_title = episode_title;
            if (episode_number) updateData.episode_number = episode_number;
            if (episode_description) updateData.episode_description = episode_description;
            if (duration) updateData.duration = duration;
            if (uri) updateData.uri = uri;

            const updatedEpisode = await Episode.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            res.json({
                status: 'success',
                message: 'Episode updated successfully',
                data: { episode: updatedEpisode }
            });
        } catch (error) {
            console.error('Update episode error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // DELETE /api/admin/episodes/:id - Xóa episode
    async deleteEpisode(req, res) {
        try {
            const { adminUserId } = req.query;
            const { id } = req.params;
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            const Episode = require('../models/Episode');
            const episode = await Episode.findById(id);
            if (!episode) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Episode not found'
                });
            }

            const movieId = episode.movie_id;

            // Delete episode
            await Episode.findByIdAndDelete(id);

            // Update movie's total episodes count
            const totalEpisodes = await Episode.countDocuments({ movie_id: movieId });
            await Movie.findByIdAndUpdate(movieId, { 
                total_episodes: totalEpisodes 
            });

            res.json({
                status: 'success',
                message: 'Episode deleted successfully'
            });
        } catch (error) {
            console.error('Delete episode error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // POST /api/admin/episodes/reorder - Sắp xếp lại thứ tự episodes
    async reorderEpisodes(req, res) {
        try {
            const { adminUserId } = req.query;
            const { movie_id, episodes } = req.body; // episodes: [{ id, episode_number }]
            
            const admin = await User.findById(adminUserId);
            if (!admin || admin.role !== 'admin') {
                return res.status(403).json({
                    status: 'error',
                    message: 'Admin access required'
                });
            }

            if (!movie_id || !episodes || !Array.isArray(episodes)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'movie_id and episodes array are required'
                });
            }

            // Verify movie exists
            const movie = await Movie.findById(movie_id);
            if (!movie) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Movie not found'
                });
            }

            const Episode = require('../models/Episode');

            // Update episode numbers in batch
            for (const episodeUpdate of episodes) {
                await Episode.findByIdAndUpdate(
                    episodeUpdate.id,
                    { episode_number: episodeUpdate.episode_number },
                    { runValidators: true }
                );
            }

            // Get updated episodes list
            const updatedEpisodes = await Episode.find({ movie_id })
                .sort({ episode_number: 1 });

            res.json({
                status: 'success',
                message: 'Episodes reordered successfully',
                data: { episodes: updatedEpisodes }
            });
        } catch (error) {
            console.error('Reorder episodes error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // PUT /api/admin/users/:id/lock - Lock/Unlock user account
    async updateUserLockStatus(req, res) {
        try {
            const { id } = req.params;
            const { action } = req.body; // 'lock' or 'unlock'

            if (!['lock', 'unlock'].includes(action)) {
                return res.status(400).json({
                    status: 'error',
                    message: "Action must be 'lock' or 'unlock'"
                });
            }

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    status: 'error',
                    message: 'User not found'
                });
            }

            // Optional: prevent admin from locking themselves
            // if (req.adminUser && req.adminUser._id.toString() === id) {
            //     return res.status(400).json({ status: 'error', message: 'Cannot lock your own account' });
            // }

            const is_locked = action === 'lock';
            user.is_locked = is_locked;
            await user.save();

            res.json({
                status: 'success',
                message: is_locked ? 'User locked successfully' : 'User unlocked successfully',
                data: {
                    id: user._id,
                    isLocked: user.is_locked
                }
            });
        } catch (error) {
            console.error('Update user lock status error:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new AdminController(); 