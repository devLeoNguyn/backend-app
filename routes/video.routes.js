const express = require('express');
const router = express.Router();
const {
    getVideoStreamUrl,
    refreshVideoStreamUrl,
    getVideoStatus,
    getVideoEmbed
} = require('../controllers/video.controller');

// === PUBLIC ROUTES ===

/**
 * 🎬 GET /api/video-url/:videoId
 * Lấy CloudFront Signed URL cho video streaming
 * 
 * @param {string} videoId - Episode ID hoặc Movie ID
 * @query {string} type - 'auto' | 'episode' | 'movie' (default: 'auto')
 * 
 * Response for HLS (.m3u8):
 * {
 *   "status": "success",
 *   "data": {
 *     "videoId": "episode_id",
 *     "type": "hls",
 *     "movie": { "_id": "...", "title": "...", "type": "Phim bộ" },
 *     "episode": { "_id": "...", "title": "Tập 1", "number": 1 },
 *     "stream": {
 *       "url": "https://d123.cloudfront.net/hls-output/video.m3u8?...",
 *       "cookies": { ... },
 *       "expiration": "2023-12-01T11:00:00Z",
 *       "expiresIn": "10 minutes"
 *     }
 *   }
 * }
 * 
 * Response for MP4:
 * {
 *   "status": "success", 
 *   "data": {
 *     "videoId": "movie_id",
 *     "type": "single",
 *     "movie": { "_id": "...", "title": "...", "type": "Phim lẻ" },
 *     "episode": null,
 *     "stream": {
 *       "url": "https://d123.cloudfront.net/videos/movie.mp4?...",
 *       "expiration": "2023-12-01T11:00:00Z",
 *       "expiresIn": "10 minutes"
 *     }
 *   }
 * }
 */
router.get('/:videoId', getVideoStreamUrl);

/**
 * 🔄 POST /api/video-url/:videoId/refresh
 * Làm mới Signed URL (tạo URL mới với thời gian hết hạn mới)
 */
router.post('/:videoId/refresh', refreshVideoStreamUrl);

/**
 * 📊 GET /api/video-url/:videoId/status
 * Kiểm tra trạng thái video (có sẵn, cần thanh toán, format, v.v.)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "videoId": "episode_id",
 *     "available": true,
 *     "accessible": true,
 *     "requiresPayment": false,
 *     "format": "hls",
 *     "movie": {
 *       "_id": "...",
 *       "title": "...",
 *       "type": "Phim bộ",
 *       "price": 0,
 *       "isFree": true
 *     }
 *   }
 * }
 */
router.get('/:videoId/status', getVideoStatus);

/**
 * 📺 GET /api/video-url/:videoId/embed
 * Lấy embed HTML cho video player (tùy chọn cho admin/preview)
 * 
 * Query params:
 * - width: Player width (default: '100%')
 * - height: Player height (default: 'auto')  
 * - autoplay: Auto play video (default: false)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "videoId": "episode_id",
 *     "streamUid": "cloudflare-stream-uid",
 *     "embedHTML": "<stream src='...' controls></stream>...",
 *     "previewUrl": "https://customer-account.cloudflarestream.com/uid"
 *   }
 * }
 */
router.get('/:videoId/embed', getVideoEmbed);

// === PROTECTED ROUTES (nếu cần thêm authentication) ===

// TODO: Có thể thêm middleware auth cho các route cần đăng nhập
// const { authenticateToken } = require('../middleware/auth');
// router.get('/:videoId/premium', authenticateToken, getPremiumVideoUrl);

module.exports = router; 