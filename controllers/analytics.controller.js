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
}

module.exports = new AnalyticsController();
