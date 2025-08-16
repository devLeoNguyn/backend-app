const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { validateDeepLink } = require('../utils/deepLinkHelper');

// Middleware to handle validation errors consistently
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ [Notification Validation] Errors found:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  console.log('✅ [Notification Validation] All validations passed');
  next();
};

// Validate userId format 
const validateUserId = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ')
];

// Validate create notification
const validateCreateNotification = [
  body('title')
    .notEmpty()
    .withMessage('Tiêu đề thông báo là bắt buộc')
    .isString()
    .withMessage('Tiêu đề phải là chuỗi')
    .isLength({ max: 100 })
    .withMessage('Tiêu đề không được vượt quá 100 ký tự')
    .trim(),
    
  body('body')
    .notEmpty()
    .withMessage('Nội dung thông báo là bắt buộc')
    .isString()
    .withMessage('Nội dung phải là chuỗi')
    .isLength({ max: 500 })
    .withMessage('Nội dung không được vượt quá 500 ký tự')
    .trim(),
    
  body('type')
    .optional()
    .isIn(['manual', 'auto'])
    .withMessage('Loại thông báo phải là manual hoặc auto'),
    
  body('target_type')
    .notEmpty()
    .withMessage('Loại đối tượng nhận thông báo là bắt buộc')
    .isIn(['all', 'segment', 'specific_users'])
    .withMessage('Loại đối tượng nhận phải là all, segment hoặc specific_users'),
    
  body('target_users')
    .optional()
    .custom((value, { req }) => {
      if (req.body.target_type === 'specific_users') {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('Danh sách người dùng không được để trống khi target_type là specific_users');
        }
        
        // Validate each userId is a valid MongoDB ObjectId
        for (const userId of value) {
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('ID người dùng không hợp lệ trong danh sách target_users');
          }
        }
      }
      return true;
    }),
    
  body('segment')
    .optional()
    .custom((value, { req }) => {
      if (req.body.target_type === 'segment' && !value) {
        throw new Error('Segment là bắt buộc khi target_type là segment');
      }
      return true;
    })
    .isString()
    .withMessage('Segment phải là chuỗi'),
    
  body('scheduled_at')
    .optional()
    .isISO8601()
    .withMessage('Thời gian lên lịch phải có định dạng ISO8601')
    .custom(value => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Thời gian lên lịch phải trong tương lai');
      }
      return true;
    }),
    
  body('deep_link')
    .optional()
    .isString()
    .withMessage('Deep link phải là chuỗi')
    .isLength({ max: 255 })
    .withMessage('Deep link không được vượt quá 255 ký tự')
    .custom(value => {
      if (value) {
        const validation = validateDeepLink(value);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
      }
      return true;
    }),
    
  body('image_url')
    .optional()
    .isString()
    .withMessage('Image URL phải là chuỗi')
    .custom(value => {
      if (value) {
        const trimmedValue = value.trim();
        
        // Kiểm tra URL hợp lệ
        try {
          new URL(trimmedValue);
        } catch {
          throw new Error('Image URL phải là URL hợp lệ (ví dụ: https://example.com/image.jpg)');
        }
        
        // Kiểm tra extension ảnh
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const hasValidExtension = validExtensions.some(ext => 
          trimmedValue.toLowerCase().includes(ext)
        );
        
        if (!hasValidExtension) {
          throw new Error('Image URL phải có định dạng ảnh hợp lệ (.jpg, .jpeg, .png, .gif, .webp)');
        }
      }
      return true;
    }),
    
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Priority phải là high, normal hoặc low'),
    
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Thời gian hết hạn phải có định dạng ISO8601'),
    
  body('created_by')
    .notEmpty()
    .withMessage('created_by là bắt buộc')
    .isMongoId()
    .withMessage('created_by phải là ObjectId hợp lệ'),

  handleValidationErrors
];

// Validate update notification
const validateUpdateNotification = [
  body('title')
    .optional()
    .isString()
    .withMessage('Tiêu đề phải là chuỗi')
    .isLength({ max: 100 })
    .withMessage('Tiêu đề không được vượt quá 100 ký tự')
    .trim(),
    
  body('body')
    .optional()
    .isString()
    .withMessage('Nội dung phải là chuỗi')
    .isLength({ max: 500 })
    .withMessage('Nội dung không được vượt quá 500 ký tự')
    .trim(),
    
  body('target_type')
    .optional()
    .isIn(['all', 'segment', 'specific_users'])
    .withMessage('Loại đối tượng nhận phải là all, segment hoặc specific_users'),
    
  // Reuse the same validation logic for target_users and segment
  body('target_users').optional().custom((value, { req }) => {
    if (req.body.target_type === 'specific_users') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error('Danh sách người dùng không được để trống khi target_type là specific_users');
      }
      
      // Validate each userId is a valid MongoDB ObjectId
      for (const userId of value) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          throw new Error('ID người dùng không hợp lệ trong danh sách target_users');
        }
      }
    }
    return true;
  }),
    
  body('segment').optional().custom((value, { req }) => {
    if (req.body.target_type === 'segment' && !value) {
      throw new Error('Segment là bắt buộc khi target_type là segment');
    }
    return true;
  }),
    
  body('deep_link')
    .optional()
    .isString()
    .withMessage('Deep link phải là chuỗi')
    .isLength({ max: 255 })
    .withMessage('Deep link không được vượt quá 255 ký tự'),
    
  body('image_url')
    .optional()
    .isURL()
    .withMessage('Image URL phải là URL hợp lệ'),
    
  body('priority')
    .optional()
    .isIn(['high', 'normal', 'low'])
    .withMessage('Priority phải là high, normal hoặc low'),
    
  body('expires_at')
    .optional()
    .isISO8601()
    .withMessage('Thời gian hết hạn phải có định dạng ISO8601'),
    
  body('userId')
    .notEmpty()
    .withMessage('userId là bắt buộc')
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),

  handleValidationErrors
];

// Validate notification ID parameter
const validateNotificationId = [
  param('id')
    .notEmpty()
    .withMessage('ID thông báo là bắt buộc')
    .isMongoId()
    .withMessage('ID thông báo phải là ObjectId hợp lệ'),
  handleValidationErrors
];

// Validate schedule notification
const validateScheduleNotification = [
  body('userId')
    .notEmpty()
    .withMessage('userId là bắt buộc')
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),
    
  body('scheduled_at')
    .notEmpty()
    .withMessage('Thời gian lên lịch là bắt buộc')
    .isISO8601()
    .withMessage('Thời gian lên lịch phải có định dạng ISO8601')
    .custom(value => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Thời gian lên lịch phải trong tương lai');
      }
      return true;
    }),
  handleValidationErrors
];

// Validate bulk operation
const validateBulkOperation = [
  body('userId')
    .notEmpty()
    .withMessage('userId là bắt buộc')
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),
    
  body('notification_ids')
    .notEmpty()
    .withMessage('notification_ids là bắt buộc')
    .isArray()
    .withMessage('notification_ids phải là mảng')
    .custom(value => {
      if (value.length === 0) {
        throw new Error('notification_ids không được rỗng');
      }
      
      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`ID không hợp lệ trong mảng: ${id}`);
        }
      }
      return true;
    }),
  handleValidationErrors
];


// Validate FCM token registration
const validateFCMToken = [
  body('userId')
    .notEmpty()
    .withMessage('userId là bắt buộc')
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),
    
  body('fcmToken')
    .notEmpty()
    .withMessage('fcmToken là bắt buộc')
    .isString()
    .withMessage('fcmToken phải là chuỗi'),
    
  body('platform')
    .optional()
    .isIn(['ios', 'android', 'web'])
    .withMessage('Platform phải là ios, android hoặc web'),
  handleValidationErrors
];

// Validate notification settings update
const validateNotificationSettings = [
  body('userId')
    .notEmpty()
    .withMessage('userId là bắt buộc')
    .isMongoId()
    .withMessage('userId phải là ObjectId hợp lệ'),
    
  body('pushNotificationsEnabled')
    .optional()
    .isBoolean()
    .withMessage('pushNotificationsEnabled phải là boolean'),
    
  body('notificationSettings.newMovies')
    .optional()
    .isBoolean()
    .withMessage('notificationSettings.newMovies phải là boolean'),
    
  body('notificationSettings.newEpisodes')
    .optional()
    .isBoolean()
    .withMessage('notificationSettings.newEpisodes phải là boolean'),
    
  body('notificationSettings.favoriteGenres')
    .optional()
    .isArray()
    .withMessage('notificationSettings.favoriteGenres phải là mảng'),
    
  body('notificationSettings.quietHours.enabled')
    .optional()
    .isBoolean()
    .withMessage('notificationSettings.quietHours.enabled phải là boolean'),
    
  body('notificationSettings.quietHours.start')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('notificationSettings.quietHours.start phải có định dạng HH:MM'),
    
  body('notificationSettings.quietHours.end')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('notificationSettings.quietHours.end phải có định dạng HH:MM'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserId,
  validateCreateNotification,
  validateUpdateNotification,
  validateNotificationId,
  validateScheduleNotification,
  validateBulkOperation,
  validateFCMToken,
  validateNotificationSettings
};
