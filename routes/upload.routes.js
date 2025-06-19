const express = require('express');
const router = express.Router();
const { upload } = require('../utils/cloudflare.config'); // Image upload middleware
const {
    uploadVideo, // Video upload middleware
    uploadVideoToStream,
    uploadImage,
    getUsageStats,
    deleteVideoFromStream,
    uploadVideoFromUrl
} = require('../controllers/upload.controller');

/**
 * 🖼️ UPLOAD IMAGES TO CLOUDFLARE IMAGES
 */

/**
 * 📤 Upload single image
 * POST /api/upload/image
 * Content-Type: multipart/form-data
 * 
 * Form fields:
 * - file: Image file (jpeg, jpg, png, gif, webp)
 * - folder: Folder name (optional, default: 'general')
 * - variant: Image variant (optional, default: 'public')
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "id": "cloudflare-image-id",
 *     "urls": {
 *       "original": "https://imagedelivery.net/account/id/public",
 *       "avatar": "https://imagedelivery.net/account/id/avatar",
 *       "thumbnail": "https://imagedelivery.net/account/id/thumb",
 *       "medium": "https://imagedelivery.net/account/id/medium"
 *     }
 *   }
 * }
 */
router.post('/image', upload.single('file'), uploadImage);

/**
 * 🎬 UPLOAD VIDEOS TO CLOUDFLARE STREAM
 */

/**
 * 📤 Upload video file to Cloudflare Stream
 * POST /api/upload/video
 * Content-Type: multipart/form-data
 * 
 * Form fields:
 * - file: Video file (mp4, avi, mov, webm, mkv, flv) - Max 500MB
 * - episodeId: Episode ID (required)
 * - movieTitle: Movie title (optional)
 * - episodeTitle: Episode title (optional)
 * - metadata: Additional metadata JSON (optional)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "episodeId": "episode_id",
 *     "streamUid": "cloudflare-stream-uid",
 *     "uploadStatus": "ready|inprogress",
 *     "playback": { ... },
 *     "thumbnail": "thumbnail_url",
 *     "processingStatus": "completed|processing"
 *   }
 * }
 */
router.post('/video', uploadVideo.single('file'), uploadVideoToStream);

/**
 * 🔗 Upload video from URL to Cloudflare Stream
 * POST /api/upload/video-from-url
 * Content-Type: application/json
 * 
 * Body:
 * {
 *   "url": "https://example.com/video.mp4",
 *   "episodeId": "episode_id",
 *   "movieTitle": "Movie Title",
 *   "episodeTitle": "Episode Title",
 *   "metadata": { ... }
 * }
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "episodeId": "episode_id",
 *     "streamUid": "cloudflare-stream-uid",
 *     "status": "ready|inprogress",
 *     "sourceUrl": "original_url"
 *   }
 * }
 */
router.post('/video-from-url', uploadVideoFromUrl);

/**
 * 📊 MONITORING & MANAGEMENT
 */

/**
 * 📈 Get usage statistics for cost monitoring
 * GET /api/upload/usage
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "stream": {
 *       "totalPlaybackMinutes": 1500,
 *       "estimatedCost": 0,
 *       "freeMinutesRemaining": 3500,
 *       "planLimit": "5000 minutes/month ($5 plan)"
 *     },
 *     "totalEstimatedCost": 0,
 *     "recommendations": [...]
 *   }
 * }
 */
router.get('/usage', getUsageStats);

/**
 * 🗑️ Delete video from Cloudflare Stream
 * DELETE /api/upload/video/:episodeId
 * 
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "episodeId": "episode_id",
 *     "streamUid": "deleted-stream-uid"
 *   }
 * }
 */
router.delete('/video/:episodeId', deleteVideoFromStream);

/**
 * 🎯 BULK OPERATIONS (Tùy chọn cho admin)
 */

/**
 * 📋 Upload multiple images at once
 * POST /api/upload/images-bulk
 */
router.post('/images-bulk', upload.array('files', 10), async (req, res) => {
    try {
        const { folder = 'bulk', variant = 'public' } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Không có files được upload'
            });
        }

        console.log(`🖼️ Bulk uploading ${req.files.length} images to Cloudflare`);

        const uploadPromises = req.files.map(async (file, index) => {
            try {
                const { uploadToCloudflare } = require('../utils/cloudflare.config');
                const imageData = await uploadToCloudflare(file, `${folder}/${index}`, variant);
                return {
                    index,
                    success: true,
                    data: imageData
                };
            } catch (error) {
                return {
                    index,
                    success: false,
                    error: error.message,
                    filename: file.originalname
                };
            }
        });

        const results = await Promise.all(uploadPromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        res.json({
            status: 'success',
            message: `Upload hoàn thành: ${successful.length} thành công, ${failed.length} thất bại`,
            data: {
                total: req.files.length,
                successful: successful.length,
                failed: failed.length,
                results: results
            }
        });

    } catch (error) {
        console.error('❌ Bulk upload error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi upload hàng loạt: ' + error.message
        });
    }
});

/**
 * 🔄 MIGRATION TOOLS (Tùy chọn cho việc migrate từ AWS)
 */

/**
 * 🚚 Migrate video from legacy AWS path to Cloudflare Stream
 * POST /api/upload/migrate-video
 */
router.post('/migrate-video', async (req, res) => {
    try {
        const { episodeId, legacyUrl } = req.body;
        
        if (!episodeId || !legacyUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'episodeId và legacyUrl là bắt buộc'
            });
        }

        console.log('🚚 Migrating video from AWS to Cloudflare Stream:', { episodeId, legacyUrl });

        // 🔗 Upload từ legacy URL
        const uploadResult = await cloudflareStreamService.uploadVideo({
            url: legacyUrl,
            metadata: {
                episodeId,
                migratedFrom: 'AWS',
                legacyUrl,
                migratedAt: new Date().toISOString()
            }
        });

        // 📝 Cập nhật Episode
        const Episode = require('../models/Episode');
        await Episode.findByIdAndUpdate(episodeId, {
            uri: uploadResult.uid // Thay thế AWS path bằng Stream UID
        });

        res.json({
            status: 'success',
            message: 'Video đã được      thành công từ AWS sang Cloudflare Stream',
            data: {
                episodeId,
                streamUid: uploadResult.uid,
                legacyUrl,
                status: uploadResult.status
            }
        });

    } catch (error) {
        console.error('❌ Migration error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi migrate video: ' + error.message
        });
    }
});

module.exports = router; 