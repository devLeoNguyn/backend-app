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
                '48h': Math.round(movie.price * 0.3), // 30% giá phim
                '30d': Math.round(movie.price * 0.5)   // 50% giá phim
            };

            const amount = rentalPrices[rentalType];
            if (!amount) {
                throw new Error('Loại thuê không hợp lệ');
            }

            // Tạo order code unique
            const orderCode = Date.now();
            
            // Tạo PayOS order
            const description = `Thuê phim ${rentalType}: ${movie.title}`;
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

            // Lưu thông tin payment với rentalType
            const payment = new MoviePayment({
                orderCode,
                userId,
                movieId,
                amount,
                description,
                status: 'PENDING',
                rentalType, // Lưu rentalType vào payment
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
     * Kiểm tra trạng thái thanh toán mà không confirm
     */
    async checkPaymentStatus(orderCode, userId) {
        try {
            // Tìm payment
            const payment = await MoviePayment.findOne({ orderCode });

            if (!payment) {
                return { isPaid: false, status: 'NOT_FOUND' };
            }

            // Kiểm tra quyền
            if (payment.userId.toString() !== userId) {
                return { isPaid: false, status: 'UNAUTHORIZED' };
            }

            // Nếu đã SUCCESS thì return true luôn
            if (payment.status === 'SUCCESS') {
                return { isPaid: true, status: 'SUCCESS' };
            }

            // Nếu PENDING thì check với PayOS
            if (payment.status === 'PENDING') {
                try {
                    const payosOrder = await payOS.getPaymentLinkInformation(orderCode);
                    
                    if (payosOrder.status === 'PAID') {
                        return { isPaid: true, status: 'PAID' };
                    } else {
                        return { isPaid: false, status: payosOrder.status || 'PENDING' };
                    }
                } catch (payosError) {
                    console.log('PayOS check error:', payosError.message);
                    return { isPaid: false, status: 'PENDING' };
                }
            }

            return { isPaid: false, status: payment.status };

        } catch (error) {
            console.error('Error checking payment status:', error);
            return { isPaid: false, status: 'ERROR' };
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
            const payosOrder = await payOS.getPaymentLinkInformation(orderCode);
            
            if (payosOrder.status !== 'PAID') {
                throw new Error('Đơn hàng chưa được thanh toán');
            }

            // Cập nhật payment status
            payment.status = 'SUCCESS';
            payment.paymentTime = new Date();
            payment.paymentMethod = payosOrder.paymentMethod || 'BANK_TRANSFER';
            await payment.save();

            // Lấy rentalType từ payment (đã lưu khi tạo order)
            const rentalType = payment.rentalType;
            if (!rentalType) {
                throw new Error('Không tìm thấy thông tin loại thuê');
            }

            // Tạo rental record với status 'paid' - thời gian sẽ được tính khi user nhấn "xem ngay"
            const rental = new MovieRental({
                userId: payment.userId,
                movieId: payment.movieId._id,
                paymentId: payment._id,
                rentalType,
                status: 'paid'
                // startTime và endTime sẽ được set khi activate rental
            });

            await rental.save();

            return {
                success: true,
                data: {
                    rental: await MovieRental.findById(rental._id)
                        .populate('movieId', 'movie_title poster_path duration movie_type')
                        .populate('paymentId', 'amount orderCode'),
                    message: `Thanh toán thành công! Nhấn "Xem ngay" để bắt đầu thuê phim ${rentalType === '48h' ? '48 giờ' : '30 ngày'}.`
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
        const startTime = Date.now();
        
        try {
            console.log(`[DEBUG] Checking rental access - userId: ${userId}, movieId: ${movieId}, startTime: ${startTime}`);
            console.log(`[DEBUG] UserID type: ${typeof userId}, MovieID type: ${typeof movieId}`);
            
            // Convert to ObjectId if needed (critical fix)
            const mongoose = require('mongoose');
            const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
            const movieObjectId = mongoose.Types.ObjectId.isValid(movieId) ? new mongoose.Types.ObjectId(movieId) : movieId;
            
            console.log(`[DEBUG] Converted IDs - userObjectId: ${userObjectId}, movieObjectId: ${movieObjectId}`);
            console.log(`[DEBUG] Converted types - userObjectId: ${typeof userObjectId}, movieObjectId: ${typeof movieObjectId}`);
            
            // Debug: Check if there are any rentals for this user-movie combination
            const allRentals = await MovieRental.find({ userId: userObjectId, movieId: movieObjectId });
            console.log(`[DEBUG] All rentals for user-movie:`, allRentals.map(r => ({
                id: r._id,
                status: r.status,
                startTime: r.startTime,
                endTime: r.endTime,
                createdAt: r.createdAt
            })));
            
            // Also check with findOne query similar to findRentalAccess
            const testQuery = {
                userId: userObjectId,
                movieId: movieObjectId,
                status: { $in: ['paid', 'active'] },
                $or: [
                    { status: 'paid' },
                    { 
                        status: 'active',
                        startTime: { $lte: new Date() },
                        endTime: { $gte: new Date() }
                    }
                ]
            };
            console.log(`[DEBUG] Test query:`, JSON.stringify(testQuery, null, 2));
            
            const testResult = await MovieRental.findOne(testQuery);
            console.log(`[DEBUG] Test query result:`, testResult ? {
                id: testResult._id,
                status: testResult.status,
                startTime: testResult.startTime,
                endTime: testResult.endTime
            } : null);
            
            // Optimize: Check rental first (more likely to exist), skip movie verification for performance
            // Movie existence is already verified when rental was created
            const dbQueryStart = Date.now();
            const rental = await MovieRental.findRentalAccess(userObjectId, movieObjectId);
            const dbQueryEnd = Date.now();
            
            console.log(`[DEBUG] Database query time: ${dbQueryEnd - dbQueryStart}ms`);
            console.log(`[DEBUG] Active rental found:`, rental ? {
                id: rental._id,
                status: rental.status,
                startTime: rental.startTime,
                endTime: rental.endTime
            } : null);
            
            if (!rental) {
                const endTime = Date.now();
                console.log(`[DEBUG] No rental found - Total time: ${endTime - startTime}ms`);
                return {
                    hasAccess: false,
                    message: 'Bạn chưa thuê phim này hoặc đã hết hạn'
                };
            }

            // Check if rental is paid but not activated yet
            if (rental.status === 'paid') {
                const endTime = Date.now();
                console.log(`[DEBUG] Paid rental found, needs activation - Total time: ${endTime - startTime}ms`);
                return {
                    hasAccess: true,
                    needsActivation: true,
                    rental: rental,
                    message: 'Nhấn "Xem ngay" để bắt đầu xem phim'
                };
            }

            // For active rentals, record access (async without waiting to improve performance)
            const recordAccessStart = Date.now();
            rental.recordAccess().catch(err => {
                console.error('Error recording access (non-blocking):', err);
            });
            const recordAccessEnd = Date.now();
            console.log(`[DEBUG] Record access time: ${recordAccessEnd - recordAccessStart}ms`);

            const remainingTime = rental.remainingTime;
            const remainingHours = Math.ceil(remainingTime / (1000 * 60 * 60));
            const remainingDays = Math.ceil(remainingTime / (1000 * 60 * 60 * 24));

            const endTime = Date.now();
            console.log(`[DEBUG] Access granted - Remaining time: ${remainingTime}ms, Hours: ${remainingHours}, Days: ${remainingDays}`);
            console.log(`[DEBUG] Total checkRentalAccess time: ${endTime - startTime}ms`);

            return {
                hasAccess: true,
                needsActivation: false,
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
            
            let countPipeline = [
                { $match: query },
                {
                    $lookup: {
                        from: 'movies',
                        localField: 'movieId',
                        foreignField: '_id',
                        as: 'movie'
                    }
                },
                { $unwind: '$movie' }
            ];

            // Add title search to count if provided
            if (options.searchTitle) {
                countPipeline.push({
                    $match: {
                        'movie.movie_title': { $regex: options.searchTitle, $options: 'i' }
                    }
                });
            }

            countPipeline.push({ $count: 'total' });
            
            const totalResult = await MovieRental.aggregate(countPipeline);
            const total = totalResult[0]?.total || 0;
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
            const stats = await MoviePayment.getRevenueStats(startDate, endDate);
            
            let totalRevenue = 0;
            let totalRentals = 0;
            const dailyStats = {};

            stats.forEach(stat => {
                totalRevenue += stat.totalRevenue;
                totalRentals += stat.totalRentals;
                
                const date = stat._id.date;
                if (!dailyStats[date]) {
                    dailyStats[date] = {
                        date,
                        '48h': { revenue: 0, count: 0 },
                        '30d': { revenue: 0, count: 0 },
                        total: { revenue: 0, count: 0 }
                    };
                }
                
                const rentalType = stat._id.rentalType;
                dailyStats[date][rentalType] = {
                    revenue: stat.totalRevenue,
                    count: stat.totalRentals
                };
                
                dailyStats[date].total.revenue += stat.totalRevenue;
                dailyStats[date].total.count += stat.totalRentals;
            });

            // Convert dailyStats object to sorted array
            const sortedDailyStats = Object.values(dailyStats).sort((a, b) => 
                new Date(a.date) - new Date(b.date)
            );

            return {
                success: true,
                data: {
                    summary: {
                        totalRevenue,
                        totalRentals,
                        averageRevenuePerRental: totalRentals > 0 ? Math.round(totalRevenue / totalRentals) : 0
                    },
                    dailyStats: sortedDailyStats
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

    /**
     * Kích hoạt rental khi user nhấn "xem ngay"
     */
    async activateRental(userId, movieId) {
        try {
            // Tìm rental với status 'paid' hoặc 'pending' (backward compatibility)
            const rental = await MovieRental.findOne({ 
                userId, 
                movieId, 
                status: { $in: ['paid', 'pending'] }
            });
            
            if (!rental) {
                throw new Error('Không tìm thấy rental cần kích hoạt');
            }

            // Sử dụng method activate() từ model
            await rental.activate();
            
            // Return rental với populate data
            const activatedRental = await MovieRental.findById(rental._id)
                .populate('movieId', 'movie_title poster_path duration movie_type')
                .populate('paymentId', 'amount orderCode');

            return {
                success: true,
                data: {
                    rental: activatedRental,
                    message: `Kích hoạt thành công! Bạn có thể xem phim trong ${rental.rentalType === '48h' ? '48 giờ' : '30 ngày'}.`
                }
            };

        } catch (error) {
            console.error('Error activating rental:', error);
            throw error;
        }
    }
}

module.exports = new RentalService(); 