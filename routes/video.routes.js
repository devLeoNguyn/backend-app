const express = require('express');
const router = express.Router();
const {
    getVideoStreamUrl,
    refreshVideoStreamUrl,
    getVideoStatus,
    getVideoEmbed,
    getVideoSubtitle,
    getVideoQualityUrl
} = require('../controllers/video.controller');

// === PUBLIC ROUTES ===

/**
 * 🎬 GET /api/video-url/:videoId
 * Lấy Cloudflare Stream URL cho EXPO APP
 * 
 * @param {string} videoId - Episode ID hoặc Movie ID
 * @query {string} type - 'auto' | 'episode' | 'movie' (default: 'auto')
 * @query {string} quality - 'auto' | '360p' | '480p' | '720p' (default: 'auto')
 * 
 * EXPO APP Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "videoId": "episode_id",
 *     "streamUid": "cloudflare-stream-uid",
 *     "video": {
 *       "uri": "https://customer-xxx.cloudflarestream.com/uid/manifest/video.m3u8", // HLS primary
 *       "fallbackUri": "https://customer-xxx.cloudflarestream.com/uid/manifest/video.mp4", // MP4 fallback
 *       "qualities": {
 *         "low": "...360p.mp4",
 *         "medium": "...480p.mp4", 
 *         "high": "...720p.mp4"
 *       },
 *       "poster": "https://customer-xxx.cloudflarestream.com/uid/thumbnails/thumbnail.jpg?time=5s",
 *       "thumbnail": "https://customer-xxx.cloudflarestream.com/uid/thumbnails/thumbnail.jpg",
 *       "subtitles": {
 *         "vi": { "label": "Tiếng Việt", "language": "vi", "uri": "https://api.cloudflare.com/.../vtt" },
 *         "en": { "label": "English", "language": "en", "uri": "https://api.cloudflare.com/.../vtt" }
 *       },
 *       "duration": 1800,
 *       "size": 2048576
 *     },
 *     "movie": { "_id": "...", "title": "...", "type": "Phim bộ", "is_free": true, "price": 0 },
 *     "episode": { "_id": "...", "title": "Tập 1", "number": 1 }
 *   }
 * }
 * 
 * EXPO Usage Example:
 * ```javascript
 * import { Video } from 'expo-av';
 * 
 * const response = await fetch('/api/video-url/episode_id');
 * const { data } = await response.json();
 * 
 * // Use in Expo Video component
 * <Video
 *   source={{ uri: data.video.uri }}
 *   posterSource={{ uri: data.video.poster }}
 *   resizeMode="contain"
 *   shouldPlay
 *   isLooping={false}
 * />
 * ```
 */
// ===== SPECIFIC ROUTES (phải đặt trước generic routes) =====

/**
 * 📱 GET /api/video-url/:videoId/quality/:qualityLevel
 * Lấy video URL với quality cụ thể cho Expo app
 */
router.get('/:videoId/quality/:qualityLevel', getVideoQualityUrl);

/**
 * 📋 GET /api/video-url/:videoId/subtitle/:language
 * Lấy subtitle WebVTT content cho language cụ thể
 */
router.get('/:videoId/subtitle/:language', getVideoSubtitle);

/**
 * 🔄 POST /api/video-url/:videoId/refresh
 * Làm mới Signed URL (tạo URL mới với thời gian hết hạn mới)
 */
router.post('/:videoId/refresh', refreshVideoStreamUrl);

/**
 * 📊 GET /api/video-url/:videoId/status
 * Kiểm tra trạng thái video (có sẵn, cần thanh toán, format, v.v.)
 */
router.get('/:videoId/status', getVideoStatus);

/**
 * 📺 GET /api/video-url/:videoId/embed
 * Lấy embed HTML cho video player (tùy chọn cho admin/preview)
 */
router.get('/:videoId/embed', getVideoEmbed);

// ===== GENERIC ROUTE (phải đặt cuối cùng) =====

router.get('/:videoId', getVideoStreamUrl);

// === PROTECTED ROUTES (nếu cần thêm authentication) ===

// TODO: Có thể thêm middleware auth cho các route cần đăng nhập
// const { authenticateToken } = require('../middleware/auth');
// router.get('/:videoId/premium', authenticateToken, getPremiumVideoUrl);

module.exports = router; 