const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    getUserInteractionsSummary,
<<<<<<< Updated upstream
    getNotificationMute,
    updateNotificationMute

=======
    updateNotificationMute,
    getNotificationMute
>>>>>>> Stashed changes
} = require('../controllers/user.controller');
const { upload } = require('../utils/cloudflare.config');

// Get current user profile (userId từ query params)
router.get('/profile', getProfile);

// Update user profile (có thể kèm upload avatar - userId từ query params, file từ form-data)
router.put('/profile', upload.single('avatar'), updateProfile);

// Thêm route lấy trạng thái mute notification
router.get('/notification-mute', getNotificationMute);

// Thêm route cập nhật trạng thái mute notification
router.put('/notification-mute', updateNotificationMute);

<<<<<<< Updated upstream
=======
// Thêm route lấy trạng thái mute notification
router.get('/notification-mute', getNotificationMute);

// ❌ REMOVED: Get comprehensive user interactions for a specific movie
// Original: GET /api/users/{userId}/interactions/movie/{movieId}
// Use instead: GET /api/movies/{id}/detail-with-interactions?userId={userId}
>>>>>>> Stashed changes

router.get('/:userId/interactions/summary', getUserInteractionsSummary);

module.exports = router;
    