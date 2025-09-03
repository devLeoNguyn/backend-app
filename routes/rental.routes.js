const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const rentalController = require('../controllers/rental.controller');
const { validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ [Validation] Errors found:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array()
        });
    }
    console.log('✅ [Validation] All validations passed');
    next();
};

// Validation middleware
const validateCreateRental = [
    body('userId')
        .notEmpty()
        .withMessage('userId là bắt buộc')
        .isMongoId()
        .withMessage('userId phải là ObjectId hợp lệ'),
    body('movieId')
        .notEmpty()
        .withMessage('movieId là bắt buộc')
        .isMongoId()
        .withMessage('movieId phải là ObjectId hợp lệ'),
    body('rentalType')
        .notEmpty()
        .withMessage('rentalType là bắt buộc')
        .isIn(['48h', '30d'])
        .withMessage('rentalType phải là 48h hoặc 30d')
];

const validateConfirmPayment = [
    body('orderCode')
        .notEmpty()
        .withMessage('orderCode là bắt buộc')
        .isNumeric()
        .withMessage('orderCode phải là số'),
    body('userId')
        .notEmpty()
        .withMessage('userId là bắt buộc')
        .isMongoId()
        .withMessage('userId phải là ObjectId hợp lệ')
];

const validateMovieId = [
    param('movieId')
        .notEmpty()
        .withMessage('movieId là bắt buộc')
        .custom((value) => {
            console.log('🔍 [Validation] movieId:', value, 'type:', typeof value);
            // More flexible validation - allow any string for now to debug
            if (!value || value === 'undefined') {
                throw new Error('movieId không hợp lệ');
            }
            return true;
        })
];

const validateUserId = [
    query('userId')
        .notEmpty()
        .withMessage('userId là bắt buộc')
        .custom((value) => {
            console.log('🔍 [Validation] userId:', value, 'type:', typeof value);
            // More flexible validation - allow any string for now to debug
            if (!value || value === 'undefined') {
                throw new Error('userId không hợp lệ');
            }
            return true;
        })
];

const validateRentalId = [
    param('rentalId')
        .notEmpty()
        .withMessage('rentalId là bắt buộc')
        .isMongoId()
        .withMessage('rentalId phải là ObjectId hợp lệ')
];

const validateDateRange = [
    query('startDate')
        .notEmpty()
        .withMessage('startDate là bắt buộc')
        .isISO8601()
        .withMessage('startDate phải có định dạng ISO8601'),
    query('endDate')
        .notEmpty()
        .withMessage('endDate là bắt buộc')
        .isISO8601()
        .withMessage('endDate phải có định dạng ISO8601')
];

// ===========================================
// RENTAL ENDPOINTS
// ===========================================

/**
 * @route GET /api/rentals/test
 * @desc Test endpoint để kiểm tra rental route hoạt động
 * @access Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Rental routes working!',
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

/**
 * @route POST /api/rentals/rent
 * @desc Tạo order thuê phim
 * @access Public
 */
router.post('/rent', validateCreateRental, rentalController.createRentalOrder);

/**
 * @route POST /api/rentals/check-status
 * @desc Kiểm tra trạng thái thanh toán mà không confirm
 * @access Public
 */
router.post('/check-status', validateConfirmPayment, rentalController.checkPaymentStatus);

/**
 * @route POST /api/rentals/confirm-payment
 * @desc Xác nhận thanh toán và kích hoạt rental
 * @access Public
 */
router.post('/confirm-payment', validateConfirmPayment, rentalController.confirmRentalPayment);

/**
 * @route GET /api/rentals/status/:movieId
 * @desc Kiểm tra quyền xem phim
 * @access Public
 */
router.get('/status/:movieId', (req, res, next) => {
    console.log('🛣️ [Route] /status/:movieId hit');
    console.log('📍 [Route] Params:', req.params);
    console.log('📍 [Route] Query:', req.query);
    next();
}, validateMovieId, validateUserId, handleValidationErrors, rentalController.checkRentalAccess);

/**
 * @route GET /api/rentals/history
 * @desc Lấy lịch sử thuê phim của user
 * @access Public
 * @query userId, page, limit, status, rentalType
 */
router.get('/history', validateUserId, rentalController.getUserRentalHistory);

/**
 * @route PUT /api/rentals/:rentalId/cancel
 * @desc Hủy rental
 * @access Public
 */
router.put('/:rentalId/cancel', validateRentalId, rentalController.cancelRental);

const validateActivateRental = [
    body('userId')
        .notEmpty()
        .withMessage('userId là bắt buộc')
        .isMongoId()
        .withMessage('userId phải là ObjectId hợp lệ'),
    body('movieId')
        .notEmpty()
        .withMessage('movieId là bắt buộc')
        .isMongoId()
        .withMessage('movieId phải là ObjectId hợp lệ')
];

/**
 * @route POST /api/rentals/activate
 * @desc Kích hoạt rental khi user nhấn "xem ngay"
 * @access Public
 */
router.post('/activate', validateActivateRental, rentalController.activateRental);

// ===========================================
// STATISTICS ENDPOINTS (Admin)
// ===========================================

/**
 * @route GET /api/rentals/stats/revenue
 * @desc Lấy thống kê revenue
 * @access Admin
 */
router.get('/stats/revenue', validateDateRange, rentalController.getRevenueStats);

/**
 * @route GET /api/rentals/stats/popular
 * @desc Lấy danh sách phim được thuê nhiều nhất
 * @access Admin
 */
router.get('/stats/popular', rentalController.getPopularRentals);

// ===========================================
// CRON JOB MANAGEMENT ENDPOINTS (Admin)
// ❌ KHÔNG SỬ DỤNG - Admin frontend và mobile app không gọi các endpoint này
// 🗓️ Date: 24/08/2025 - Comment để clean unused APIs
// 🔧 Lý do: Chỉ dành cho system admin manual control, không có UI tương ứng
// ===========================================

/*
/**
 * @route GET /api/rentals/cron/status
 * @desc Lấy trạng thái các cron jobs
 * @access Admin
 */
// router.get('/cron/status', rentalController.getCronJobsStatus);

/*
/**
 * @route POST /api/rentals/cron/manual-check
 * @desc Chạy manual check rental expiration
 * @access Admin
 */
// router.post('/cron/manual-check', rentalController.runManualCheck);

/*
/**
 * @route PUT /api/rentals/cron/:action/:jobName
 * @desc Start/Stop một cron job cụ thể
 * @access Admin
 * @param action - start hoặc stop
 * @param jobName - tên của job (expiredRentalsCheck, expiringNotifications, etc.)
 */
// router.put('/cron/:action/:jobName', rentalController.controlCronJob);

/*
/**
 * @route PUT /api/rentals/cron/all/:action
 * @desc Start/Stop tất cả cron jobs
 * @access Admin
 * @param action - start hoặc stop
 */
// router.put('/cron/all/:action', rentalController.controlAllCronJobs);

/*
/**
 * @route POST /api/rentals/test-expiry-notification
 * @desc Test rental expiry notification manually
 * @access Admin
 */
// router.post('/test-expiry-notification', rentalController.testRentalExpiryNotification);

// ===========================================
// WEBHOOK ENDPOINTS
// ❌ KHÔNG SỬ DỤNG - Webhook handler chưa implement đầy đủ
// 🗓️ Date: 24/08/2025 - Comment vì logic chưa hoàn thiện
// 🔧 Lý do: TODO verify signature và auto-confirmation chưa được implement
// ===========================================

/*
/**
 * @route POST /api/rentals/webhook/payment-success
 * @desc Webhook từ PayOS khi thanh toán thành công
 * @access PayOS only
 */
// router.post('/webhook/payment-success', rentalController.handlePaymentWebhook);

module.exports = router; 