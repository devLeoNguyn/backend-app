const MoviePayment = require('../models/MoviePayment');
const MovieRental = require('../models/MovieRental');
const Movie = require('../models/Movie');
const User = require('../models/User');

class AnalyticsController {
    // Dashboard tổng quan doanh thu
    async getRevenueDashboard(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Validate dates
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            // Tổng doanh thu trong khoảng thời gian từ MoviePayment
            const revenueStats = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' },
                        totalOrders: { $sum: 1 },
                        avgOrderValue: { $avg: '$amount' }
                    }
                }
            ]);

            // Số lượng khách hàng đang thuê (có rental active) từ MovieRental
            const activeCustomers = await MovieRental.aggregate([
                {
                    $match: {
                        status: 'active',
                        endDate: { $gte: new Date() }
                    }
                },
                {
                    $group: {
                        _id: '$userId'
                    }
                },
                {
                    $count: 'activeCustomers'
                }
            ]);

            // Phân bố theo gói thuê từ MovieRental
            const rentalTypeDistribution = await MovieRental.aggregate([
                {
                    $match: {
                        createdAt: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: '$rentalType',
                        count: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'moviepayments',
                        localField: '_id',
                        foreignField: 'rentalType',
                        as: 'payments'
                    }
                },
                {
                    $addFields: {
                        revenue: { $sum: '$payments.amount' }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    totalRevenue: revenueStats[0]?.totalRevenue || 0,
                    totalOrders: revenueStats[0]?.totalOrders || 0,
                    avgOrderValue: revenueStats[0]?.avgOrderValue || 0,
                    activeCustomers: activeCustomers[0]?.activeCustomers || 0,
                    rentalTypeDistribution: rentalTypeDistribution || []
                }
            });

        } catch (error) {
            console.error('Error in getRevenueDashboard:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Doanh thu theo thời gian (cho Line Chart)
    async getRevenueTrends(req, res) {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            let dateFormat;
            switch(groupBy) {
                case 'week':
                    dateFormat = { $dateToString: { format: "%Y-%U", date: "$paymentTime" } };
                    break;
                case 'month':
                    dateFormat = { $dateToString: { format: "%Y-%m", date: "$paymentTime" } };
                    break;
                case 'day':
                default:
                    dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$paymentTime" } };
            }

            const trends = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: dateFormat,
                        revenue: { $sum: '$amount' },
                        orders: { $sum: 1 }
                    }
                },
                {
                    $sort: { '_id': 1 }
                }
            ]);

            res.json({
                success: true,
                data: trends
            });

        } catch (error) {
            console.error('Error in getRevenueTrends:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Top phim có doanh thu cao (cho Bar Chart)
    async getTopMoviesByRevenue(req, res) {
        try {
            const { startDate, endDate, limit = 10 } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            // First get rental data with payment info
            const revenueByMovie = await MovieRental.aggregate([
                {
                    $match: {
                        createdAt: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'moviepayments',
                        localField: 'paymentId',
                        foreignField: '_id',
                        as: 'payment'
                    }
                },
                {
                    $unwind: '$payment'
                },
                {
                    $match: {
                        'payment.status': 'SUCCESS'
                    }
                },
                {
                    $group: {
                        _id: '$movieId',
                        totalRevenue: { $sum: '$payment.amount' },
                        totalRentals: { $sum: 1 },
                        avgRentalValue: { $avg: '$payment.amount' }
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                },
                {
                    $limit: parseInt(limit)
                }
            ]);

            // Then get movie details for each
            const topMovies = await Promise.all(
                revenueByMovie.map(async (item) => {
                    try {
                        const movie = await Movie.findById(item._id);
                        return {
                            _id: item._id,
                            movieTitle: movie ? movie.movie_title : 'Unknown Movie',
                            moviePoster: movie ? movie.poster_path : '/default-poster.jpg',
                            totalRevenue: item.totalRevenue,
                            totalRentals: item.totalRentals,
                            avgRentalValue: item.avgRentalValue
                        };
                    } catch (error) {
                        return {
                            _id: item._id,
                            movieTitle: 'Unknown Movie',
                            moviePoster: '/default-poster.jpg',
                            totalRevenue: item.totalRevenue,
                            totalRentals: item.totalRentals,
                            avgRentalValue: item.avgRentalValue
                        };
                    }
                })
            );

            res.json({
                success: true,
                data: topMovies
            });

        } catch (error) {
            console.error('Error in getTopMoviesByRevenue:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Phân bố gói thuê (cho Pie Chart)
    async getRentalTypeDistribution(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            const distribution = await MovieRental.aggregate([
                {
                    $match: {
                        createdAt: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'moviepayments',
                        localField: 'paymentId',
                        foreignField: '_id',
                        as: 'payment'
                    }
                },
                {
                    $unwind: '$payment'
                },
                {
                    $match: {
                        'payment.status': 'SUCCESS'
                    }
                },
                {
                    $group: {
                        _id: '$rentalType',
                        count: { $sum: 1 },
                        revenue: { $sum: '$payment.amount' },
                        percentage: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        data: { $push: '$$ROOT' },
                        total: { $sum: '$count' }
                    }
                },
                {
                    $unwind: '$data'
                },
                {
                    $project: {
                        _id: '$data._id',
                        rentalType: '$data._id',
                        count: '$data.count',
                        revenue: '$data.revenue',
                        percentage: { 
                            $multiply: [
                                { $divide: ['$data.count', '$total'] }, 
                                100
                            ] 
                        }
                    }
                }
            ]);

            res.json({
                success: true,
                data: distribution
            });

        } catch (error) {
            console.error('Error in getRentalTypeDistribution:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Repeat Purchase Rate - tỷ lệ mua lại trong 90 ngày
    async getRepeatPurchaseRate(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Validate dates - mặc định 90 ngày
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            const repeatStats = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        purchaseCount: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalBuyers: { $sum: 1 },
                        repeaters: { 
                            $sum: { 
                                $cond: [{ $gte: ['$purchaseCount', 2] }, 1, 0] 
                            } 
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalBuyers: 1,
                        repeaters: 1,
                        repeatRate: { 
                            $cond: [
                                { $eq: ['$totalBuyers', 0] }, 
                                0, 
                                { $divide: ['$repeaters', '$totalBuyers'] }
                            ] 
                        }
                    }
                }
            ]);

            const result = repeatStats[0] || { totalBuyers: 0, repeaters: 0, repeatRate: 0 };

            // Tính confidence interval (95%)
            const n = result.totalBuyers;
            const p = result.repeatRate;
            let confidenceInterval = { lower: 0, upper: 0 };
            
            if (n > 0 && n * p >= 5 && n * (1 - p) >= 5) {
                const margin = 1.96 * Math.sqrt(p * (1 - p) / n);
                confidenceInterval = {
                    lower: Math.max(0, p - margin),
                    upper: Math.min(1, p + margin)
                };
            }

            res.json({
                success: true,
                data: {
                    ...result,
                    period: { startDate: start, endDate: end },
                    confidenceInterval
                }
            });

        } catch (error) {
            console.error('Error in getRepeatPurchaseRate:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Churn Rate - so sánh 2 kỳ 90 ngày
    async getChurnRate(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Validate dates
            const currentEnd = endDate ? new Date(endDate) : new Date();
            const currentStart = startDate ? new Date(startDate) : new Date(currentEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
            
            // Previous period (90 ngày trước đó)
            const previousEnd = new Date(currentStart.getTime() - 1);
            const previousStart = new Date(previousEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

            // Lấy users active trong period A (previous)
            const usersA = await MoviePayment.distinct('userId', {
                status: 'SUCCESS',
                paymentTime: { 
                    $gte: previousStart,
                    $lte: previousEnd
                }
            });

            // Lấy users active trong period B (current)
            const usersB = await MoviePayment.distinct('userId', {
                status: 'SUCCESS',
                paymentTime: { 
                    $gte: currentStart,
                    $lte: currentEnd
                }
            });

            // Tính churn
            const usersBSet = new Set(usersB.map(String));
            const churnedUsers = usersA.filter(userId => !usersBSet.has(String(userId)));
            
            const churnCount = churnedUsers.length;
            const totalUsersA = usersA.length;
            const churnRate = totalUsersA > 0 ? churnCount / totalUsersA : 0;

            // Tính confidence interval cho churn rate
            const n = totalUsersA;
            const p = churnRate;
            let confidenceInterval = { lower: 0, upper: 0 };
            
            if (n > 0 && n * p >= 5 && n * (1 - p) >= 5) {
                const margin = 1.96 * Math.sqrt(p * (1 - p) / n);
                confidenceInterval = {
                    lower: Math.max(0, p - margin),
                    upper: Math.min(1, p + margin)
                };
            }

            res.json({
                success: true,
                data: {
                    periodA: { startDate: previousStart, endDate: previousEnd },
                    periodB: { startDate: currentStart, endDate: currentEnd },
                    totalUsersA,
                    totalUsersB: usersB.length,
                    churnedUsers: churnCount,
                    churnRate,
                    confidenceInterval
                }
            });

        } catch (error) {
            console.error('Error in getChurnRate:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Top 10 phim có lượt view cao nhất
    async getTopMoviesByViews(req, res) {
        try {
            const { startDate, endDate, limit = 10 } = req.query;
            
            // Xây dựng match criteria
            let matchCriteria = { completed: true };
            if (startDate && endDate) {
                matchCriteria.last_watched = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const Watching = require('../models/Watching');
            const topMovies = await Watching.aggregate([
                {
                    $match: matchCriteria
                },
                {
                    $lookup: {
                        from: 'episodes',
                        localField: 'episode_id',
                        foreignField: '_id',
                        as: 'episode'
                    }
                },
                {
                    $unwind: '$episode'
                },
                {
                    $group: {
                        _id: '$episode.movie_id',
                        totalViews: { $sum: 1 },
                        uniqueViewers: { $addToSet: '$user_id' },
                        lastViewedAt: { $max: '$last_watched' }
                    }
                },
                {
                    $addFields: {
                        uniqueViewersCount: { $size: '$uniqueViewers' }
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
                        movieTitle: '$movie.movie_title',
                        posterPath: '$movie.poster_path',
                        movieType: '$movie.movie_type',
                        price: '$movie.price',
                        totalViews: 1,
                        uniqueViewersCount: 1,
                        lastViewedAt: 1,
                        avgViewsPerUser: {
                            $round: [{ $divide: ['$totalViews', '$uniqueViewersCount'] }, 2]
                        }
                    }
                },
                {
                    $sort: { totalViews: -1 }
                },
                {
                    $limit: parseInt(limit)
                }
            ]);

            res.json({
                success: true,
                data: topMovies,
                metadata: {
                    count: topMovies.length,
                    period: startDate && endDate ? { startDate, endDate } : 'all_time',
                    type: 'highest_views'
                }
            });

        } catch (error) {
            console.error('Error in getTopMoviesByViews:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Top 10 phim có lượt view thấp nhất (ít người xem)
    async getLowViewMovies(req, res) {
        try {
            const { startDate, endDate, limit = 10, minViewThreshold = 1 } = req.query;
            
            // Xây dựng match criteria cho watching
            let watchingMatch = { completed: true };
            if (startDate && endDate) {
                watchingMatch.last_watched = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const Watching = require('../models/Watching');
            const Movie = require('../models/Movie');

            // Lấy tất cả movies và view count của chúng
            const movieViews = await Watching.aggregate([
                {
                    $match: watchingMatch
                },
                {
                    $lookup: {
                        from: 'episodes',
                        localField: 'episode_id',
                        foreignField: '_id',
                        as: 'episode'
                    }
                },
                {
                    $unwind: '$episode'
                },
                {
                    $group: {
                        _id: '$episode.movie_id',
                        totalViews: { $sum: 1 },
                        uniqueViewers: { $addToSet: '$user_id' },
                        lastViewedAt: { $max: '$last_watched' }
                    }
                },
                {
                    $addFields: {
                        uniqueViewersCount: { $size: '$uniqueViewers' }
                    }
                }
            ]);

            // Tạo map view counts
            const viewCountMap = {};
            movieViews.forEach(item => {
                viewCountMap[item._id.toString()] = {
                    totalViews: item.totalViews,
                    uniqueViewersCount: item.uniqueViewersCount,
                    lastViewedAt: item.lastViewedAt
                };
            });

            // Lấy tất cả movies và filter những phim có view thấp
            const allMovies = await Movie.find({}, {
                movie_title: 1,
                poster_path: 1,
                movie_type: 1,
                price: 1,
                createdAt: 1
            });

            // Tạo danh sách movies với view count (bao gồm movies có 0 views)
            const moviesWithViews = allMovies.map(movie => {
                const movieId = movie._id.toString();
                const viewData = viewCountMap[movieId] || {
                    totalViews: 0,
                    uniqueViewersCount: 0,
                    lastViewedAt: null
                };

                return {
                    _id: movie._id,
                    movieTitle: movie.movie_title,
                    posterPath: movie.poster_path,
                    movieType: movie.movie_type,
                    price: movie.price,
                    createdAt: movie.createdAt,
                    totalViews: viewData.totalViews,
                    uniqueViewersCount: viewData.uniqueViewersCount,
                    lastViewedAt: viewData.lastViewedAt,
                    avgViewsPerUser: viewData.uniqueViewersCount > 0 
                        ? Math.round((viewData.totalViews / viewData.uniqueViewersCount) * 100) / 100 
                        : 0
                };
            });

            // Sắp xếp theo totalViews tăng dần và lấy top phim có view thấp nhất
            const lowViewMovies = moviesWithViews
                .filter(movie => movie.totalViews >= parseInt(minViewThreshold))
                .sort((a, b) => {
                    if (a.totalViews !== b.totalViews) {
                        return a.totalViews - b.totalViews; // Sắp xếp theo view tăng dần
                    }
                    return new Date(b.createdAt) - new Date(a.createdAt); // Nếu cùng view, ưu tiên phim mới
                })
                .slice(0, parseInt(limit));

            res.json({
                success: true,
                data: lowViewMovies,
                metadata: {
                    count: lowViewMovies.length,
                    period: startDate && endDate ? { startDate, endDate } : 'all_time',
                    type: 'lowest_views',
                    minViewThreshold: parseInt(minViewThreshold)
                }
            });

        } catch (error) {
            console.error('Error in getLowViewMovies:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }

    // Top Customers - khách hàng có doanh thu cao nhất
    async getTopCustomers(req, res) {
        try {
            const { startDate, endDate, limit = 10 } = req.query;
            
            // Validate dates
            const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const end = endDate ? new Date(endDate) : new Date();

            // Aggregation để tính top customers
            const topCustomersData = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: '$userId',
                        totalSpent: { $sum: '$amount' },
                        orders: { $sum: 1 },
                        lastPurchase: { $max: '$paymentTime' }
                    }
                },
                {
                    $sort: { totalSpent: -1 }
                },
                {
                    $limit: parseInt(limit, 10)
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'userInfo'
                    }
                },
                {
                    $unwind: {
                        path: '$userInfo',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        userId: '$_id',
                        totalSpent: 1,
                        orders: 1,
                        lastPurchase: 1,
                        avgOrderValue: { $divide: ['$totalSpent', '$orders'] },
                        name: { $ifNull: ['$userInfo.name', null] },
                        email: { $ifNull: ['$userInfo.email', null] }
                    }
                }
            ]);

            // Tính tổng doanh thu để có % share
            const totalRevenueData = await MoviePayment.aggregate([
                {
                    $match: {
                        status: 'SUCCESS',
                        paymentTime: { 
                            $gte: start,
                            $lte: end
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$amount' }
                    }
                }
            ]);

            const totalRevenue = (totalRevenueData[0]?.totalRevenue) || 0;

            // Thêm % share cho mỗi customer
            const result = topCustomersData.map(customer => ({
                ...customer,
                share: totalRevenue > 0 ? customer.totalSpent / totalRevenue : 0
            }));

            res.json({
                success: true,
                data: {
                    customers: result,
                    totalRevenue,
                    period: { startDate: start, endDate: end }
                }
            });

        } catch (error) {
            console.error('Error in getTopCustomers:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    }
}

module.exports = new AnalyticsController();
