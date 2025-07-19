const rentalService = require('../services/rental.service');
const cronService = require('../services/cron.service');
const { validationResult } = require('express-validator');

class RentalController {

    /**
     * POST /api/rentals/rent
     * Tạo order thuê phim
     */
    async createRentalOrder(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    errors: errors.array()
                });
            }

            const { userId, movieId, rentalType } = req.body;

            // Validate rentalType
            if (!['48h', '30d'].includes(rentalType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Loại thuê không hợp lệ. Chọn 48h hoặc 30d'
                });
            }

            const result = await rentalService.createRentalOrder(userId, movieId, rentalType);

            res.status(201).json({
                success: true,
                message: 'Tạo order thuê phim thành công',
                data: result.data
            });

        } catch (error) {
            console.error('Error in createRentalOrder:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi tạo order thuê phim',
                data: null
            });
        }
    }

    /**
     * POST /api/rentals/check-status
     * Kiểm tra trạng thái thanh toán mà không confirm
     */
    async checkPaymentStatus(req, res) {
        try {
            const { orderCode, userId } = req.body;

            if (!orderCode || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'orderCode và userId là bắt buộc'
                });
            }

            const result = await rentalService.checkPaymentStatus(orderCode, userId);

            res.json({
                success: true,
                message: 'Kiểm tra trạng thái thành công',
                data: result
            });

        } catch (error) {
            console.error('Error in checkPaymentStatus:', error);
            res.status(200).json({
                success: false,
                message: error.message || 'Lỗi server khi kiểm tra trạng thái thanh toán',
                data: { isPaid: false }
            });
        }
    }

    /**
     * POST /api/rentals/confirm-payment
     * Xác nhận thanh toán và kích hoạt rental
     */
    async confirmRentalPayment(req, res) {
        try {
            const { orderCode, userId } = req.body;

            if (!orderCode || !userId) {
                return res.status(400).json({
                    success: false,
                    message: 'orderCode và userId là bắt buộc'
                });
            }

            const result = await rentalService.confirmRentalPayment(orderCode, userId);

            res.json({
                success: true,
                message: result.data.message,
                data: result.data.rental
            });

        } catch (error) {
            console.error('Error in confirmRentalPayment:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi xác nhận thanh toán',
                data: null
            });
        }
    }

    /**
     * GET /api/rentals/status/:movieId
     * Kiểm tra quyền xem phim
     */
    async checkRentalAccess(req, res) {
        try {
            console.log('🎯 [Controller] checkRentalAccess called');
            console.log('📍 [Controller] Request params:', req.params);
            console.log('📍 [Controller] Request query:', req.query);
            console.log('📍 [Controller] Request URL:', req.originalUrl);
            console.log('📍 [Controller] Request method:', req.method);

            const { movieId } = req.params;
            const { userId } = req.query;

            console.log('🔍 [Controller] Extracted values:', { movieId, userId });

            if (!userId) {
                console.log('❌ [Controller] Missing userId');
                return res.status(400).json({
                    success: false,
                    message: 'userId là bắt buộc'
                });
            }

            console.log('🚀 [Controller] Calling rentalService.checkRentalAccess...');
            const result = await rentalService.checkRentalAccess(userId, movieId);
            console.log('✅ [Controller] Service result:', result);

            res.json({
                success: true,
                data: result
            });

        } catch (error) {
            console.error('💥 [Controller] Error in checkRentalAccess:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi kiểm tra quyền xem',
                data: null
            });
        }
    }

    /**
     * GET /api/rentals/history
     * Lấy lịch sử thuê phim của user
     * @query userId - ID của user
     * @query page - Số trang (default: 1)
     * @query limit - Số lượng kết quả mỗi trang (default: 10)
     * @query status - Lọc theo trạng thái rental
     * @query rentalType - Lọc theo loại thuê (48h/30d)
     * @query searchTitle - Tìm kiếm theo tên phim
     */
    async getUserRentalHistory(req, res) {
        try {
            const { userId, page = 1, limit = 10, status, rentalType, searchTitle } = req.query;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId là bắt buộc'
                });
            }

            const options = {
                page: parseInt(page),
                limit: parseInt(limit),
                status,
                rentalType,
                searchTitle
            };

            const result = await rentalService.getUserRentalHistory(userId, options);

            res.json({
                success: true,
                message: 'Lấy lịch sử thuê phim thành công',
                data: result.data
            });

        } catch (error) {
            console.error('Error in getUserRentalHistory:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi lấy lịch sử thuê phim',
                data: null
            });
        }
    }

    /**
     * PUT /api/rentals/:rentalId/cancel
     * Hủy rental
     */
    async cancelRental(req, res) {
        try {
            const { rentalId } = req.params;
            const { userId } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId là bắt buộc'
                });
            }

            const result = await rentalService.cancelRental(userId, rentalId);

            res.json({
                success: true,
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error in cancelRental:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi hủy rental',
                data: null
            });
        }
    }

    /**
     * POST /api/rentals/activate
     * Kích hoạt rental khi user nhấn "xem ngay"
     */
    async activateRental(req, res) {
        try {
            const { userId, movieId } = req.body;

            if (!userId || !movieId) {
                return res.status(400).json({
                    success: false,
                    message: 'userId và movieId là bắt buộc'
                });
            }

            const result = await rentalService.activateRental(userId, movieId);

            res.json({
                success: true,
                message: result.data.message,
                data: result.data.rental
            });

        } catch (error) {
            console.error('Error in activateRental:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi kích hoạt rental',
                data: null
            });
        }
    }

    /**
     * GET /api/rentals/stats/revenue
     * Lấy thống kê revenue (admin only)
     */
    async getRevenueStats(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'startDate và endDate là bắt buộc'
                });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Định dạng ngày không hợp lệ'
                });
            }

            const result = await rentalService.getRevenueStats(start, end);

            res.json({
                success: true,
                message: 'Lấy thống kê revenue thành công',
                data: result.data
            });

        } catch (error) {
            console.error('Error in getRevenueStats:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi lấy thống kê',
                data: null
            });
        }
    }

    /**
     * GET /api/rentals/stats/popular
     * Lấy danh sách phim được thuê nhiều nhất
     */
    async getPopularRentals(req, res) {
        try {
            const { limit = 10 } = req.query;

            const result = await rentalService.getPopularRentals(parseInt(limit));

            res.json({
                success: true,
                message: 'Lấy danh sách phim phổ biến thành công',
                data: result.data
            });

        } catch (error) {
            console.error('Error in getPopularRentals:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Lỗi server khi lấy danh sách phim phổ biến',
                data: null
            });
        }
    }

    // ===========================================
    // CRON JOB MANAGEMENT ENDPOINTS (Admin only)
    // ===========================================

    /**
     * GET /api/rentals/cron/status
     * Lấy trạng thái các cron jobs
     */
    async getCronJobsStatus(req, res) {
        try {
            const status = cronService.getJobsStatus();

            res.json({
                success: true,
                message: 'Lấy trạng thái cron jobs thành công',
                data: status
            });

        } catch (error) {
            console.error('Error in getCronJobsStatus:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy trạng thái cron jobs',
                data: null
            });
        }
    }

    /**
     * POST /api/rentals/cron/manual-check
     * Chạy manual check rental expiration
     * @access Admin
     */
    async runManualCheck(req, res) {
        try {
            const cronService = require('../services/cron.service');
            
            // Run manual rental check
            const rentalResult = await MovieRental.findExpiredRentals();
            const expiredCount = rentalResult.length;
            
            for (const rental of rentalResult) {
                try {
                    await rental.expire();
                } catch (error) {
                    console.error(`Error expiring rental ${rental._id}:`, error);
                }
            }
            
            // Run manual notification check
            const notificationResult = await cronService.runManualNotificationCheck();
            
            res.json({
                success: true,
                message: 'Manual check completed',
                data: {
                    expiredRentals: {
                        found: expiredCount,
                        processed: expiredCount
                    },
                    notifications: {
                        found: notificationResult.total,
                        sent: notificationResult.sent
                    }
                }
            });
        } catch (error) {
            console.error('Error in manual check:', error);
            res.status(500).json({
                success: false,
                message: 'Error running manual check',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/rentals/cron/:action/:jobName
     * Start/Stop một cron job cụ thể
     */
    async controlCronJob(req, res) {
        try {
            const { action, jobName } = req.params;

            if (!['start', 'stop'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Action phải là start hoặc stop'
                });
            }

            let result;
            if (action === 'start') {
                result = cronService.startJob(jobName);
            } else {
                result = cronService.stopJob(jobName);
            }

            if (!result) {
                return res.status(404).json({
                    success: false,
                    message: `Không tìm thấy job ${jobName}`
                });
            }

            res.json({
                success: true,
                message: `${action === 'start' ? 'Khởi động' : 'Dừng'} job ${jobName} thành công`
            });

        } catch (error) {
            console.error('Error in controlCronJob:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi điều khiển cron job',
                data: null
            });
        }
    }

    /**
     * PUT /api/rentals/cron/all/:action
     * Start/Stop tất cả cron jobs
     */
    async controlAllCronJobs(req, res) {
        try {
            const { action } = req.params;

            if (!['start', 'stop'].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: 'Action phải là start hoặc stop'
                });
            }

            if (action === 'start') {
                cronService.startAllJobs();
            } else {
                cronService.stopAllJobs();
            }

            res.json({
                success: true,
                message: `${action === 'start' ? 'Khởi động' : 'Dừng'} tất cả cron jobs thành công`
            });

        } catch (error) {
            console.error('Error in controlAllCronJobs:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi điều khiển tất cả cron jobs',
                data: null
            });
        }
    }

    // ===========================================
    // WEBHOOK HANDLERS
    // ===========================================

    /**
     * POST /api/rentals/webhook/payment-success
     * Webhook từ PayOS khi thanh toán thành công
     */
    async handlePaymentWebhook(req, res) {
        try {
            // TODO: Verify webhook signature từ PayOS
            console.log('Payment webhook received:', req.body);

            const { orderCode, status } = req.body;

            if (status === 'PAID') {
                // Auto-confirm rental payment
                // Note: Cần lấy userId từ database thông qua orderCode
                // Hiện tại webhook chỉ log, logic confirmation sẽ được gọi từ client
                console.log(`Payment confirmed for order: ${orderCode}`);
            }

            res.json({
                success: true,
                message: 'Webhook processed'
            });

        } catch (error) {
            console.error('Error in handlePaymentWebhook:', error);
            res.status(500).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }
}

module.exports = new RentalController();