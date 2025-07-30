const multer = require('multer');
const { uploadToCloudflare, deleteFromCloudflare } = require('../utils/cloudflare.config');
const cloudflareStreamService = require('../services/cloudflare-stream.service');
const Episode = require('../models/Episode');
const Movie = require('../models/Movie');

// 📁 Cấu hình Multer cho video upload
const videoStorage = multer.memoryStorage();

const videoFilter = (req, file, cb) => {
    // ✅ Chỉ cho phép các loại file video
    const allowedTypes = [
        'video/mp4', 
        'video/avi', 
        'video/mov', 
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/mkv',
        'video/flv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file video (mp4, avi, mov, webm, mkv, flv)'), false);
    }
};

// 📊 Giới hạn file video (500MB cho gói $5)
const uploadVideo = multer({
    storage: videoStorage,
    fileFilter: videoFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

/**
 * 🎬 Upload video lên Cloudflare Stream
 * POST /api/upload/video
 */
const uploadVideoToStream = async (req, res) => {
    try {
        const { episodeId, movieTitle, episodeTitle, metadata = {} } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'Không có file video được upload'
            });
        }

        if (!episodeId) {
            return res.status(400).json({
                status: 'error',
                message: 'episodeId là bắt buộc'
            });
        }

        console.log('🎬 Starting video upload to Cloudflare Stream:', {
            episodeId,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // 🔍 Kiểm tra episode tồn tại
        const episode = await Episode.findById(episodeId).populate('movie_id');
        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode không tồn tại'
            });
        }

        // 🚀 Upload lên Cloudflare Stream
        const uploadResult = await cloudflareStreamService.uploadVideo({
            videoBuffer: req.file.buffer,
            filename: req.file.originalname,
            metadata: {
                episodeId,
                movieTitle: movieTitle || episode.movie_id?.movie_title,
                episodeTitle: episodeTitle || episode.episode_title,
                episodeNumber: episode.episode_number,
                uploadedBy: req.user?.id || 'admin',
                originalFilename: req.file.originalname,
                ...metadata
            },
            requireSignedURLs: false, // Public streaming để tiết kiệm cost
            allowedOrigins: ['*']
        });

        // 📝 Cập nhật Episode với Cloudflare Stream URI đầy đủ
        const streamUid = uploadResult.uid;
        const cloudflareUri = `https://customer-xir3z8gmfm10bn16.cloudflarestream.com/${streamUid}/manifest/video.m3u8`;
        
        await Episode.findByIdAndUpdate(episodeId, {
            uri: cloudflareUri // Lưu URI đầy đủ như yêu cầu
        });

        console.log('✅ Video uploaded successfully to Cloudflare Stream:', {
            episodeId,
            streamUid,
            status: uploadResult.status
        });

        res.json({
            status: 'success',
            message: 'Video đã được upload thành công lên Cloudflare Stream',
            data: {
                episodeId,
                streamUid,
                uri: cloudflareUri, // Trả về URI đầy đủ
                uploadStatus: uploadResult.status,
                playback: uploadResult.playback,
                preview: uploadResult.preview,
                thumbnail: uploadResult.thumbnail,
                duration: uploadResult.duration,
                size: uploadResult.size,
                created: uploadResult.created,
                meta: uploadResult.meta,
                
                // 🎯 Processing info
                processingStatus: uploadResult.status === 'ready' ? 'completed' : 'processing',
                message: uploadResult.status === 'ready' ? 
                    'Video sẵn sàng để streaming' : 
                    'Video đang được xử lý, sẽ sẵn sàng trong vài phút'
            }
        });

    } catch (error) {
        console.error('❌ Video upload error:', error);
        
        // Xử lý lỗi file quá lớn
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File video quá lớn. Vui lòng chọn file nhỏ hơn 500MB'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi upload video: ' + error.message,
            code: 'VIDEO_UPLOAD_ERROR'
        });
    }
};

/**
 * 🖼️ Upload ảnh lên Cloudflare Images
 * POST /api/upload/image
 */
const uploadImage = async (req, res) => {
    try {
        const { folder = 'general', variant = 'public' } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'Không có file ảnh được upload'
            });
        }

        console.log('🖼️ Uploading image to Cloudflare:', {
            filename: req.file.originalname,
            size: req.file.size,
            folder,
            variant
        });

        // 🚀 Upload lên Cloudflare Images
        const imageData = await uploadToCloudflare(req.file, folder, variant);

        console.log('✅ Image uploaded successfully to Cloudflare Images:', imageData.id);

        res.json({
            status: 'success',
            message: 'Ảnh đã được upload thành công lên Cloudflare Images',
            data: {
                id: imageData.id,
                filename: imageData.filename,
                uploaded: imageData.uploaded,
                urls: {
                    original: imageData.original,
                    avatar: imageData.avatar,
                    thumbnail: imageData.thumbnail,
                    medium: imageData.medium
                },
                // 🎯 Recommended URL based on variant
                recommendedUrl: imageData[variant] || imageData.original
            }
        });

    } catch (error) {
        console.error('❌ Image upload error:', error);
        
        // Xử lý lỗi file quá lớn
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File ảnh quá lớn. Vui lòng chọn file nhỏ hơn 5MB'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi upload ảnh: ' + error.message,
            code: 'IMAGE_UPLOAD_ERROR'
        });
    }
};

/**
 * 📊 Lấy thông tin usage cho cost monitoring
 * GET /api/upload/usage
 */
const getUsageStats = async (req, res) => {
    try {
        // 🎬 Stream usage
        const streamUsage = await cloudflareStreamService.getUsageStats();
        
        // 🖼️ Images usage (từ API response hoặc estimate)
        const imagesUsage = {
            // Cloudflare Images có 100,000 images free/month
            estimatedImages: 'Check Cloudflare Dashboard',
            note: 'Sử dụng Cloudflare Dashboard để xem chính xác usage'
        };

        res.json({
            status: 'success',
            data: {
                period: streamUsage.period,
                stream: {
                    totalPlaybackMinutes: streamUsage.totalPlaybackMinutes,
                    estimatedCost: streamUsage.estimatedCost,
                    freeMinutesRemaining: Math.max(0, 5000 - streamUsage.totalPlaybackMinutes),
                    planLimit: '5000 minutes/month ($5 plan)',
                    data: streamUsage.data
                },
                images: imagesUsage,
                totalEstimatedCost: streamUsage.estimatedCost,
                recommendations: [
                    streamUsage.totalPlaybackMinutes > 4000 ? 
                        '⚠️ Gần đạt giới hạn 5000 phút/tháng' : 
                        '✅ Usage trong giới hạn',
                    '💡 Sử dụng quality 720p thay vì 1080p để tiết kiệm bandwidth',
                    '📱 HLS format tối ưu cho mobile streaming',
                    '🖼️ Cloudflare Images free 100,000 images/month'
                ]
            }
        });

    } catch (error) {
        console.error('❌ Get usage stats error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy thống kê usage: ' + error.message
        });
    }
};

/**
 * 🗑️ Xóa video từ Cloudflare Stream
 * DELETE /api/upload/video/:episodeId
 */
const deleteVideoFromStream = async (req, res) => {
    try {
        const { episodeId } = req.params;
        
        // 🔍 Lấy thông tin episode
        const episode = await Episode.findById(episodeId);
        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode không tồn tại'
            });
        }

        if (!episode.uri) {
            return res.status(400).json({
                status: 'error',
                message: 'Episode không có video để xóa'
            });
        }

        // 🆔 Extract Stream UID từ URI (hỗ trợ cả URI đầy đủ và Stream UID)
        function extractStreamUid(uri) {
            if (!uri) return null;
            
            // Nếu là Stream UID thuần (32 ký tự hex)
            if (uri.match(/^[a-f0-9]{32}$/i)) {
                return uri;
            }
            
            // Nếu là URI đầy đủ Cloudflare Stream
            if (uri.includes('cloudflarestream.com')) {
                const matches = uri.match(/cloudflarestream\.com\/([a-f0-9]{32})/i);
                return matches ? matches[1] : null;
            }
            
            return null;
        }

        const streamUid = extractStreamUid(episode.uri);
        if (!streamUid) {
            return res.status(400).json({
                status: 'error',
                message: 'Stream UID không hợp lệ'
            });
        }

        // 🗑️ Xóa từ Cloudflare Stream
        const deleted = await cloudflareStreamService.deleteVideo(streamUid);
        
        if (deleted) {
            // 📝 Cập nhật Episode (xóa URI)
            await Episode.findByIdAndUpdate(episodeId, {
                $unset: { uri: 1 }
            });

            console.log('✅ Video deleted from Cloudflare Stream:', streamUid);

            res.json({
                status: 'success',
                message: 'Video đã được xóa khỏi Cloudflare Stream',
                data: {
                    episodeId,
                    streamUid
                }
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Không thể xóa video từ Cloudflare Stream'
            });
        }

    } catch (error) {
        console.error('❌ Delete video error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi xóa video: ' + error.message
        });
    }
};

/**
 * 🔄 Upload video từ URL (tùy chọn)
 * POST /api/upload/video-from-url
 */
const uploadVideoFromUrl = async (req, res) => {
    try {
        const { url, episodeId, movieTitle, episodeTitle, metadata = {} } = req.body;
        
        if (!url || !episodeId) {
            return res.status(400).json({
                status: 'error',
                message: 'URL và episodeId là bắt buộc'
            });
        }

        console.log('🔗 Uploading video from URL to Cloudflare Stream:', { url, episodeId });

        // 🔍 Kiểm tra episode
        const episode = await Episode.findById(episodeId).populate('movie_id');
        if (!episode) {
            return res.status(404).json({
                status: 'error',
                message: 'Episode không tồn tại'
            });
        }

        // 🚀 Upload từ URL
        const uploadResult = await cloudflareStreamService.uploadVideo({
            url,
            metadata: {
                episodeId,
                movieTitle: movieTitle || episode.movie_id?.movie_title,
                episodeTitle: episodeTitle || episode.episode_title,
                sourceUrl: url,
                ...metadata
            }
        });

        // 📝 Cập nhật Episode với Cloudflare Stream URI đầy đủ
        const streamUid = uploadResult.uid;
        const cloudflareUri = `https://customer-xir3z8gmfm10bn16.cloudflarestream.com/${streamUid}/manifest/video.m3u8`;
        
        await Episode.findByIdAndUpdate(episodeId, {
            uri: cloudflareUri
        });

        res.json({
            status: 'success',
            message: 'Video đã được upload từ URL thành công',
            data: {
                episodeId,
                streamUid: uploadResult.uid,
                uri: cloudflareUri, // Trả về URI đầy đủ
                status: uploadResult.status,
                sourceUrl: url
            }
        });

    } catch (error) {
        console.error('❌ Upload from URL error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi upload từ URL: ' + error.message
        });
    }
};

module.exports = {
    uploadVideo, // Multer middleware
    uploadVideoToStream,
    uploadImage,
    getUsageStats,
    deleteVideoFromStream,
    uploadVideoFromUrl
}; 