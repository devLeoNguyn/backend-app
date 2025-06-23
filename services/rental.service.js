const MovieRental = require('../models/MovieRental');
const MoviePayment = require('../models/MoviePayment');
const Movie = require('../models/Movie');
const User = require('../models/User');
const payOS = require('../utils/payos.util');

class RentalService {
    
    /**
     * Tạo order thuê phim
     */
    async createRentalOrder(userId, movieId, rentalType) {
        try {
            // Kiểm tra user tồn tại
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User không tồn tại');
            }

            // Kiểm tra movie tồn tại
            const movie = await Movie.findById(movieId);
            if (!movie) {
                throw new Error('Movie không tồn tại');
            }

            // Kiểm tra xem user đã thuê phim này chưa (và còn hạn)
            const existingRental = await MovieRental.findActiveRental(userId, movieId);
            if (existingRental) {
                const remainingHours = Math.ceil(existingRental.remainingTime / (1000 * 60 * 60));
                throw new Error(`Bạn đã thuê phim này rồi. Còn lại ${remainingHours} giờ.`);
            }

            // Tính giá thuê
            const rentalPrices = {
                '48h': movie.price * 0.3, // 30% giá phim
                '30d': movie.price * 0.5   // 50% giá phim
            };

            const amount = rentalPrices[rentalType];
            if (!amount) {
                throw new Error('Loại thuê không hợp lệ');
            }

            // Tạo order code unique
            const orderCode = Date.now();
            
            // Tạo PayOS order
            const description = `${movie.title.substring(0, 20)}`;
            const payosBody = {
                orderCode,
                amount,
                description,
                returnUrl: process.env.PAYOS_RETURN_URL || 'https://your-app.com/payment/success',
                cancelUrl: process.env.PAYOS_CANCEL_URL || 'https://your-app.com/payment/cancel',
                items: [
                    {
                        name: `Thuê phim: ${movie.title}`,
                        quantity: 1,
                        price: amount
                    }
                ]
            };

            const paymentLinkRes = await payOS.createPaymentLink(payosBody);

            // Lưu thông tin payment
            const payment = new MoviePayment({
                orderCode,
                userId,
                movieId,
                amount,
                description,
                status: 'PENDING',
                payosData: {
                    bin: paymentLinkRes.bin,
                    checkoutUrl: paymentLinkRes.checkoutUrl,
                    accountNumber: paymentLinkRes.accountNumber,
                    accountName: paymentLinkRes.accountName,
                    qrCode: paymentLinkRes.qrCode
                }
            });

            await payment.save();

            return {
                success: true,
                data: {
                    orderCode,
                    checkoutUrl: paymentLinkRes.checkoutUrl,
                    amount,
                    rentalType,
                    movieTitle: movie.title,
                    qrCode: paymentLinkRes.qrCode,
                    paymentInfo: {
                        bin: paymentLinkRes.bin,
                        accountNumber: paymentLinkRes.accountNumber,
                        accountName: paymentLinkRes.accountName
                    }
                }
            };

        } catch (error) {
            console.error('Error creating rental order:', error);
            throw error;
        }
    }

    /**
     * Xác nhận thanh toán và kích hoạt rental
     */
    async confirmRentalPayment(orderCode, userId) {
        try {
            // Tìm payment
            const payment = await MoviePayment.findOne({ orderCode })
                .populate('movieId', 'title poster');

            if (!payment) {
                throw new Error('Không tìm thấy đơn hàng');
            }

            // Kiểm tra quyền
            if (payment.userId.toString() !== userId) {
                throw new Error('Unauthorized');
            }

            // Kiểm tra trạng thái từ PayOS
            const payosOrder = await payOS.getPaymentLinkInfomation(orderCode);
            
            if (payosOrder.status !== 'PAID') {
                throw new Error('Đơn hàng chưa được thanh toán');
            }

            // Cập nhật payment status
            payment.status = 'SUCCESS';
            payment.paymentTime = new Date();
            payment.paymentMethod = payosOrder.paymentMethod || 'BANK_TRANSFER';
            await payment.save();

            // Xác định loại rental từ amount
            const movie = payment.movieId;
            const rentalType = payment.amount === (movie.price * 0.3) ? '48h' : '30d';

            // Tạo rental record
            const rental = new MovieRental({
                userId: payment.userId,
                movieId: payment.movieId._id,
                paymentId: payment._id,
                rentalType,
                startTime: new Date()
            });

            await rental.save();

            return {
                success: true,
                data: {
                    rental: await MovieRental.findById(rental._id)
                        .populate('movieId', 'title poster duration')
                        .populate('paymentId', 'amount orderCode'),
                    message: `Thuê phim thành công! Bạn có thể xem phim trong ${rentalType === '48h' ? '48 giờ' : '30 ngày'}.`
                }
            };

        } catch (error) {
            console.error('Error confirming rental payment:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra quyền xem phim
     */
    async checkRentalAccess(userId, movieId) {
        try {
            console.log(`[DEBUG] Checking rental access - userId: ${userId}, movieId: ${movieId}`);
            
            // Verify movie exists
            const movie = await Movie.findById(movieId);
            if (!movie) {
                console.log(`[DEBUG] Movie not found with ID: ${movieId}`);
                throw new Error('Not Found');
            }

            const rental = await MovieRental.findActiveRental(userId, movieId);
            console.log(`[DEBUG] Active rental found:`, rental);
            
            if (!rental) {
                return {
                    hasAccess: false,
                    message: 'Bạn chưa thuê phim này hoặc đã hết hạn'
                };
            }

            // Record access
            await rental.recordAccess();

            const remainingTime = rental.remainingTime;
            const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));
            const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

            console.log(`[DEBUG] Access granted - Remaining time: ${remainingTime}ms, Hours: ${remainingHours}, Days: ${remainingDays}`);

            return {
                hasAccess: true,
                rental: rental,
                remainingTime,
                remainingHours,
                remainingDays,
                message: rental.rentalType === '48h' 
                    ? `Còn lại ${remainingHours} giờ`
                    : `Còn lại ${remainingDays} ngày`
            };

        } catch (error) {
            console.error('Error checking rental access:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch sử thuê phim của user
     */
    async getUserRentalHistory(userId, options = {}) {
        try {
            const rentals = await MovieRental.getUserRentalHistory(userId, options);
            
            // Đếm tổng số records để pagination
            const query = { userId };
            if (options.status) query.status = options.status;
            if (options.rentalType) query.rentalType = options.rentalType;
            
            const total = await MovieRental.countDocuments(query);
            const totalPages = Math.ceil(total / (options.limit || 10));

            return {
                success: true,
                data: {
                    rentals,
                    pagination: {
                        currentPage: options.page || 1,
                        totalPages,
                        total,
                        hasNext: (options.page || 1) < totalPages,
                        hasPrev: (options.page || 1) > 1
                    }
                }
            };

        } catch (error) {
            console.error('Error getting rental history:', error);
            throw error;
        }
    }

    /**
     * Hủy rental (nếu chưa hết hạn)
     */
    async cancelRental(userId, rentalId) {
        try {
            const rental = await MovieRental.findById(rentalId)
                .populate('movieId', 'title')
                .populate('paymentId', 'amount orderCode');

            if (!rental) {
                throw new Error('Không tìm thấy rental');
            }

            if (rental.userId.toString() !== userId) {
                throw new Error('Unauthorized');
            }

            if (rental.status !== 'active') {
                throw new Error('Rental đã bị hủy hoặc hết hạn');
            }

            await rental.cancel();

            return {
                success: true,
                message: 'Hủy thuê phim thành công',
                data: rental
            };

        } catch (error) {
            console.error('Error canceling rental:', error);
            throw error;
        }
    }

    /**
     * Lấy thống kê revenue (admin)
     */
    async getRevenueStats(startDate, endDate) {
        try {
            const stats = await MovieRental.getRevenueStats(startDate, endDate);
            
            let totalRevenue = 0;
            let totalRentals = 0;
            const dailyStats = {};

            stats.forEach(stat => {
                totalRevenue += stat.totalRevenue;
                totalRentals += stat.totalRentals;
                
                if (!dailyStats[stat._id.date]) {
                    dailyStats[stat._id.date] = {
                        date: stat._id.date,
                        '48h': { revenue: 0, count: 0 },
                        '30d': { revenue: 0, count: 0 },
                        total: { revenue: 0, count: 0 }
                    };
                }
                
                dailyStats[stat._id.date][stat._id.rentalType] = {
                    revenue: stat.totalRevenue,
                    count: stat.totalRentals
                };
                
                dailyStats[stat._id.date].total.revenue += stat.totalRevenue;
                dailyStats[stat._id.date].total.count += stat.totalRentals;
            });

            return {
                success: true,
                data: {
                    summary: {
                        totalRevenue,
                        totalRentals,
                        averageRevenuePerRental: totalRentals > 0 ? totalRevenue / totalRentals : 0
                    },
                    dailyStats: Object.values(dailyStats)
                }
            };

        } catch (error) {
            console.error('Error getting revenue stats:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách phim được thuê nhiều nhất
     */
    async getPopularRentals(limit = 10) {
        try {
            const popular = await MovieRental.aggregate([
                {
                    $match: {
                        status: { $in: ['active', 'expired'] }
                    }
                },
                {
                    $group: {
                        _id: '$movieId',
                        totalRentals: { $sum: 1 },
                        totalAccess: { $sum: '$accessCount' },
                        revenue48h: {
                            $sum: {
                                $cond: [{ $eq: ['$rentalType', '48h'] }, 1, 0]
                            }
                        },
                        revenue30d: {
                            $sum: {
                                $cond: [{ $eq: ['$rentalType', '30d'] }, 1, 0]
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'movies',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'movie'
                    }
                },
                {
                    $unwind: '$movie'
                },
                {
                    $project: {
                        _id: 1,
                        movieTitle: '$movie.title',
                        moviePoster: '$movie.poster',
                        moviePrice: '$movie.price',
                        totalRentals: 1,
                        totalAccess: 1,
                        revenue48h: 1,
                        revenue30d: 1,
                        averageAccessPerRental: {
                            $cond: [
                                { $gt: ['$totalRentals', 0] },
                                { $divide: ['$totalAccess', '$totalRentals'] },
                                0
                            ]
                        }
                    }
                },
                {
                    $sort: { totalRentals: -1 }
                },
                {
                    $limit: limit
                }
            ]);

            return {
                success: true,
                data: popular
            };

        } catch (error) {
            console.error('Error getting popular rentals:', error);
            throw error;
        }
    }
}

module.exports = new RentalService(); 