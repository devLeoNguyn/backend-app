const { Server } = require('socket.io');
const User = require('../models/User');
const Movie = require('../models/Movie');
const MovieRental = require('../models/MovieRental');

class WebSocketService {
    constructor() {
        this.io = null;
        this.adminSockets = new Map(); // Map để track admin connections
        this.statsCache = null;
        this.lastUpdate = null;
    }

    // Khởi tạo WebSocket server
    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' 
                    ? ["https://backend-app-lou3.onrender.com"] 
                    : ["http://localhost:5173", "http://localhost:3003"],
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.io.on('connection', (socket) => {
            console.log('🔌 New WebSocket connection:', socket.id);

            // Admin authentication
            socket.on('admin-auth', async (data) => {
                try {
                    const { adminUserId } = data;
                    const admin = await User.findById(adminUserId);
                    
                    if (admin && admin.role === 'admin') {
                        this.adminSockets.set(socket.id, {
                            adminId: adminUserId,
                            adminName: admin.full_name,
                            connectedAt: new Date()
                        });
                        
                        socket.join('admin-room');
                        socket.emit('admin-authenticated', {
                            success: true,
                            message: 'Admin authenticated successfully'
                        });
                        
                        // Gửi stats hiện tại
                        const stats = await this.getLatestStats();
                        socket.emit('stats-update', stats);
                        
                        console.log(`👑 Admin ${admin.full_name} connected via WebSocket`);
                    } else {
                        socket.emit('admin-auth-failed', {
                            success: false,
                            message: 'Admin authentication failed'
                        });
                    }
                } catch (error) {
                    console.error('Admin auth error:', error);
                    socket.emit('admin-auth-failed', {
                        success: false,
                        message: 'Authentication error'
                    });
                }
            });

            // Request latest stats
            socket.on('request-stats', async () => {
                if (this.adminSockets.has(socket.id)) {
                    const stats = await this.getLatestStats();
                    socket.emit('stats-update', stats);
                }
            });

            // Disconnect handler
            socket.on('disconnect', () => {
                if (this.adminSockets.has(socket.id)) {
                    const adminInfo = this.adminSockets.get(socket.id);
                    console.log(`👑 Admin ${adminInfo.adminName} disconnected`);
                    this.adminSockets.delete(socket.id);
                }
                console.log('🔌 WebSocket disconnected:', socket.id);
            });
        });

        // Bắt đầu periodic stats update
        this.startPeriodicUpdates();
        
        console.log('🚀 WebSocket server initialized for admin real-time updates');
    }

    // Lấy stats mới nhất
    async getLatestStats() {
        try {
            // Cache stats trong 10 giây để tránh query quá nhiều
            if (this.statsCache && this.lastUpdate && 
                Date.now() - this.lastUpdate < 10000) {
                return this.statsCache;
            }

            const [totalUsers, totalMovies, totalRevenue, recentRentals] = await Promise.all([
                User.countDocuments(),
                Movie.countDocuments(),
                this.getTotalRevenue(),
                this.getRecentRentals()
            ]);

            const stats = {
                totalUsers,
                totalMovies,
                totalRevenue,
                recentRentals,
                lastUpdated: new Date().toISOString(),
                connectedAdmins: this.adminSockets.size
            };

            this.statsCache = stats;
            this.lastUpdate = Date.now();
            
            return stats;
        } catch (error) {
            console.error('Error getting latest stats:', error);
            return null;
        }
    }

    // Lấy tổng doanh thu
    async getTotalRevenue() {
        try {
            const result = await MovieRental.aggregate([
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
                        _id: null,
                        total: { $sum: '$payment.amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                amount: result[0]?.total || 0,
                transactions: result[0]?.count || 0
            };
        } catch (error) {
            console.error('Error getting total revenue:', error);
            return { amount: 0, transactions: 0 };
        }
    }

    // Lấy rentals gần đây
    async getRecentRentals() {
        try {
            const rentals = await MovieRental.find()
                .populate('userId', 'full_name email')
                .populate('movieId', 'movie_title')
                .populate('paymentId', 'amount orderCode')
                .sort({ createdAt: -1 })
                .limit(5);

            return rentals.map(rental => ({
                id: rental._id,
                customerName: rental.userId?.full_name,
                movieTitle: rental.movieId?.movie_title,
                amount: rental.paymentId?.amount || 0,
                status: rental.status,
                createdAt: rental.createdAt.toISOString().split('T')[0]
            }));
        } catch (error) {
            console.error('Error getting recent rentals:', error);
            return [];
        }
    }

    // Bắt đầu cập nhật định kỳ
    startPeriodicUpdates() {
        // Cập nhật mỗi 30 giây
        setInterval(async () => {
            if (this.adminSockets.size > 0) {
                const stats = await this.getLatestStats();
                if (stats) {
                    this.io.to('admin-room').emit('stats-update', stats);
                    console.log(`📊 Stats broadcasted to ${this.adminSockets.size} admin(s)`);
                }
            }
        }, 30000);
    }

    // Broadcast sự kiện real-time
    broadcastToAdmins(event, data) {
        if (this.io && this.adminSockets.size > 0) {
            this.io.to('admin-room').emit(event, {
                ...data,
                timestamp: new Date().toISOString()
            });
            console.log(`📡 Broadcasted ${event} to ${this.adminSockets.size} admin(s)`);
        }
    }

    // Thông báo user mới đăng ký
    notifyNewUser(user) {
        this.broadcastToAdmins('new-user', {
            userId: user._id,
            fullName: user.full_name,
            email: user.email,
            message: `Người dùng mới: ${user.full_name} đã đăng ký`
        });
    }

    // Thông báo rental mới
    notifyNewRental(rental) {
        this.broadcastToAdmins('new-rental', {
            rentalId: rental._id,
            customerName: rental.customerName,
            movieTitle: rental.movieTitle,
            amount: rental.amount,
            message: `Giao dịch mới: ${rental.customerName} thuê ${rental.movieTitle}`
        });
    }

    // Thông báo revenue update
    notifyRevenueUpdate(revenueData) {
        this.broadcastToAdmins('revenue-update', {
            totalRevenue: revenueData.totalRevenue,
            newAmount: revenueData.newAmount,
            message: `Doanh thu cập nhật: +${revenueData.newAmount.toLocaleString()} VND`
        });
    }

    // Lấy thông tin connection hiện tại
    getConnectionInfo() {
        const connections = Array.from(this.adminSockets.values());
        return {
            totalConnections: this.adminSockets.size,
            admins: connections.map(conn => ({
                adminId: conn.adminId,
                adminName: conn.adminName,
                connectedAt: conn.connectedAt,
                duration: Math.round((Date.now() - conn.connectedAt.getTime()) / 1000)
            }))
        };
    }
}

module.exports = new WebSocketService(); 