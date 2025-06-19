const Episode = require('../models/Episode');
const Movie = require('../models/Movie');
const cloudflareStreamService = require('../services/cloudflare-stream.service');

/**
 * 🎬 API cấp Cloudflare Stream URL cho video streaming
 * GET /api/video-url/:videoId
 * 
 * videoId có thể là:
 * - episode_id (cho phim bộ)
 * - movie_id (cho phim lẻ)
 */
const getVideoStreamUrl = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { type = 'auto', quality = 'auto', format = 'auto' } = req.query;
        
        let videoData = null;
        let streamUid = null;
        let movieInfo = null;

        // 🔍 Xác định loại video và lấy thông tin
        if (type === 'episode' || type === 'auto') {
            // Thử tìm episode trước
            const episode = await Episode.findById(videoId)
                .populate('movie_id', 'movie_title is_free price movie_type');
            
            if (episode) {
                videoData = episode;
                movieInfo = episode.movie_id;
                
                // 🎬 Lấy Stream UID từ URI (thay vì path)
                if (episode.uri) {
                    streamUid = extractStreamUid(episode.uri);
                }
            }
        }
        
        if (!videoData && (type === 'movie' || type === 'auto')) {
            // Thử tìm movie (phim lẻ)
            const movie = await Movie.findById(videoId);
            if (movie) {
                movieInfo = movie;
                
                // Với phim lẻ, lấy episode duy nhất
                const episode = await Episode.findOne({ movie_id: videoId });
                if (episode && episode.uri) {
                    videoData = episode;
                    streamUid = extractStreamUid(episode.uri);
                }
            }
        }

        // ✅ Validate data
        if (!videoData || !movieInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại',
                code: 'VIDEO_NOT_FOUND'
            });
        }

        if (!streamUid) {
            return res.status(404).json({
                status: 'error',
                message: 'Stream UID không hợp lệ hoặc video chưa được upload lên Cloudflare Stream',
                code: 'INVALID_STREAM_UID'
            });
        }

        // 🔒 Kiểm tra quyền truy cập (phim có phí)
        if (!movieInfo.is_free && movieInfo.price > 0) {
            // TODO: Kiểm tra user đã thanh toán chưa
            return res.status(403).json({
                status: 'error',
                message: 'Video này yêu cầu thanh toán',
                code: 'PAYMENT_REQUIRED',
                data: {
                    movieTitle: movieInfo.movie_title,
                    price: movieInfo.price,
                    priceDisplay: movieInfo.is_free ? 'Miễn phí' : `${movieInfo.price.toLocaleString('vi-VN')} VNĐ`
                }
            });
        }

        // 🎥 Lấy Stream URL từ Cloudflare Stream
        const streamData = await cloudflareStreamService.getStreamUrl(streamUid, {
            quality,
            format
        });

        // ⚠️ Kiểm tra trạng thái video
        if (streamData.status !== 'ready') {
            return res.status(202).json({
                status: 'processing',
                message: streamData.message,
                code: 'VIDEO_PROCESSING',
                data: {
                    videoId,
                    streamUid,
                    status: streamData.status,
                    progress: streamData.progress,
                    movie: {
                        _id: movieInfo._id,
                        title: movieInfo.movie_title,
                        type: movieInfo.movie_type
                    }
                }
            });
        }

        // �� Trả về stream URLs tối ưu cho EXPO APP
        return res.json({
            status: 'success',
            data: {
                videoId,
                streamUid,
                
                // 📱 EXPO-OPTIMIZED RESPONSE
                video: {
                    // Primary streaming URL (HLS adaptive)
                    uri: streamData.expo.uri,
                    // Fallback URL (MP4)
                    fallbackUri: streamData.expo.fallbackUri,
                    
                    // Quality options cho user settings
                    qualities: streamData.expo.qualities,
                    
                    // Images
                    poster: streamData.expo.poster,
                    thumbnail: streamData.expo.thumbnail,
                    
                    // 📋 Subtitles for Expo Video
                    subtitles: streamData.expo.subtitles || {},
                    
                    // Video info
                    duration: streamData.duration,
                    size: streamData.size
                },
                
                // Movie/Episode info (minimal for app)
                movie: {
                    _id: movieInfo._id,
                    title: movieInfo.movie_title,
                    type: movieInfo.movie_type,
                    is_free: movieInfo.is_free,
                    price: movieInfo.price
                },
                
                // Episode info (chỉ khi là phim bộ)
                ...(videoData._id !== movieInfo._id && {
                    episode: {
                        _id: videoData._id,
                        title: videoData.episode_title,
                        number: videoData.episode_number
                    }
                }),
                
                // Full URLs (optional - for advanced usage)
                _debug: {
                    streamUrls: streamData.urls
                }
            }
        });

    } catch (error) {
        console.error('❌ Video streaming error:', error);
        
        // Xử lý các loại lỗi cụ thể của Cloudflare Stream
        if (error.message.includes('Cloudflare Stream configuration missing')) {
            return res.status(500).json({
                status: 'error',
                message: 'Cấu hình video streaming chưa đầy đủ',
                code: 'STREAMING_CONFIG_ERROR'
            });
        }
        
        if (error.message.includes('Video not found')) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại trong Cloudflare Stream',
                code: 'STREAM_VIDEO_NOT_FOUND'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy đường dẫn video từ Cloudflare Stream',
            code: 'STREAM_URL_GENERATION_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 🔄 API làm mới Stream URL
 * POST /api/video-url/:videoId/refresh
 */
const refreshVideoStreamUrl = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // 🔄 Gọi lại hàm getVideoStreamUrl với logic tương tự
        req.params.videoId = videoId;
        await getVideoStreamUrl(req, res);
        
    } catch (error) {
        console.error('❌ Refresh video URL error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi làm mới đường dẫn video',
            code: 'REFRESH_URL_ERROR'
        });
    }
};

/**
 * 📊 API kiểm tra trạng thái video
 * GET /api/video-url/:videoId/status
 */
const getVideoStatus = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // 🔍 Tìm video info
        let videoData = null;
        let movieInfo = null;
        let streamUid = null;
        
        // Thử tìm episode
        const episode = await Episode.findById(videoId)
            .populate('movie_id', 'movie_title is_free price movie_type');
        
        if (episode) {
            videoData = episode;
            movieInfo = episode.movie_id;
            streamUid = extractStreamUid(episode.uri);
        } else {
            // Thử tìm movie
            const movie = await Movie.findById(videoId);
            if (movie) {
                movieInfo = movie;
                const ep = await Episode.findOne({ movie_id: videoId });
                if (ep) {
                    videoData = ep;
                    streamUid = extractStreamUid(ep.uri);
                }
            }
        }

        if (!videoData || !movieInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại'
            });
        }

        const hasStreamUid = !!streamUid;
        const isAccessible = movieInfo.is_free || movieInfo.price === 0;
        
        // 📊 Lấy chi tiết từ Cloudflare Stream nếu có UID
        let streamDetails = null;
        if (hasStreamUid) {
            try {
                streamDetails = await cloudflareStreamService.getVideoDetails(streamUid);
            } catch (error) {
                console.log('Stream details not available:', error.message);
            }
        }

        return res.json({
            status: 'success',
            data: {
                videoId,
                streamUid,
                available: hasStreamUid,
                accessible: isAccessible,
                movie: {
                    _id: movieInfo._id,
                    title: movieInfo.movie_title,
                    type: movieInfo.movie_type,
                    is_free: movieInfo.is_free,
                    price: movieInfo.price
                },
                episode: videoData._id !== movieInfo._id ? {
                    _id: videoData._id,
                    title: videoData.episode_title,
                    number: videoData.episode_number
                } : null,
                stream: streamDetails ? {
                    status: streamDetails.status,
                    duration: streamDetails.duration,
                    size: streamDetails.size,
                    created: streamDetails.created,
                    modified: streamDetails.modified,
                    ready: streamDetails.status === 'ready'
                } : null,
                message: !hasStreamUid ? 'Video chưa được upload lên Cloudflare Stream' : 
                        !isAccessible ? 'Video yêu cầu thanh toán' : 
                        streamDetails?.status === 'ready' ? 'Video sẵn sàng để phát' : 
                        'Video đang được xử lý'
            }
        });

    } catch (error) {
        console.error('❌ Get video status error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi kiểm tra trạng thái video'
        });
    }
};

/**
 * 🆔 Extract Stream UID từ URI
 * @param {string} uri - URI có thể chứa Stream UID hoặc path cũ
 * @returns {string|null} - Stream UID
 */
function extractStreamUid(uri) {
    if (!uri) return null;
    
    // 🎬 Nếu là Cloudflare Stream UID (format: 36 ký tự hex)
    if (uri.match(/^[a-f0-9]{32}$/i)) {
        return uri;
    }
    
    // 🔗 Nếu là URL chứa Stream UID
    if (uri.includes('cloudflarestream.com')) {
        const matches = uri.match(/cloudflarestream\.com\/([a-f0-9]{32})/i);
        return matches ? matches[1] : null;
    }
    
    // 📁 Legacy: URI có thể là path cũ, cần migration
    // Trả về null để báo hiệu cần upload lại
    console.warn('⚠️ Legacy video URI detected, needs migration to Cloudflare Stream:', uri);
    return null;
}

/**
 * 📺 Get video embed HTML (tùy chọn cho admin/preview)
 * GET /api/video-url/:videoId/embed
 */
const getVideoEmbed = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { width = '100%', height = 'auto', autoplay = false } = req.query;
        
        // Lấy stream UID
        let streamUid = null;
        const episode = await Episode.findById(videoId);
        
        if (episode && episode.uri) {
            streamUid = extractStreamUid(episode.uri);
        } else {
            const movie = await Movie.findById(videoId);
            if (movie) {
                const ep = await Episode.findOne({ movie_id: videoId });
                if (ep && ep.uri) {
                    streamUid = extractStreamUid(ep.uri);
                }
            }
        }
        
        if (!streamUid) {
            return res.status(404).json({
                status: 'error',
                message: 'Stream UID không tồn tại'
            });
        }
        
        const embedHTML = cloudflareStreamService.generateEmbedHTML(streamUid, {
            width,
            height,
            autoplay: autoplay === 'true'
        });
        
        return res.json({
            status: 'success',
            data: {
                videoId,
                streamUid,
                embedHTML,
                previewUrl: `https://customer-${process.env.CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${streamUid}`
            }
        });
        
    } catch (error) {
        console.error('❌ Get video embed error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo embed HTML'
        });
    }
};

/**
 * 📋 API lấy subtitle WebVTT content
 * GET /api/video-url/:videoId/subtitle/:language
 */
const getVideoSubtitle = async (req, res) => {
    try {
        const { videoId, language } = req.params;
        
        // 🔍 Lấy video data để extract stream UID
        let videoData = null;
        let streamUid = null;

        // Thử tìm episode trước
        const episode = await Episode.findById(videoId);
        if (episode && episode.uri) {
            videoData = episode;
            streamUid = extractStreamUid(episode.uri);
        } else {
            // Thử tìm movie
            const movie = await Movie.findById(videoId);
            if (movie) {
                const ep = await Episode.findOne({ movie_id: videoId });
                if (ep && ep.uri) {
                    videoData = ep;
                    streamUid = extractStreamUid(ep.uri);
                }
            }
        }

        if (!streamUid) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại hoặc Stream UID không hợp lệ',
                code: 'INVALID_STREAM_UID'
            });
        }

        // 🎬 Lấy subtitle content từ Cloudflare Stream
        const subtitleContent = await cloudflareStreamService.getCaptionContent(streamUid, language);

        // 📋 Trả về WebVTT content
        res.set({
            'Content-Type': 'text/vtt',
            'Content-Disposition': `inline; filename="${videoId}_${language}.vtt"`
        });
        res.send(subtitleContent);

    } catch (error) {
        console.error('❌ Get subtitle error:', error);
        
        if (error.message.includes('Không thể lấy subtitle')) {
            return res.status(404).json({
                status: 'error',
                message: `Subtitle ${req.params.language} không tồn tại cho video này`,
                code: 'SUBTITLE_NOT_FOUND'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy subtitle',
            code: 'SUBTITLE_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 📱 API lấy video URL với quality cụ thể cho Expo app
 * GET /api/video-url/:videoId/quality/:qualityLevel
 */
const getVideoQualityUrl = async (req, res) => {
    try {
        const { videoId, qualityLevel } = req.params;
        
        // ✅ Validate quality level
        const allowedQualities = ['360p', '480p', '720p', 'auto'];
        if (!allowedQualities.includes(qualityLevel)) {
            return res.status(400).json({
                status: 'error',
                message: 'Quality không hợp lệ. Chỉ chấp nhận: 360p, 480p, 720p, auto',
                code: 'INVALID_QUALITY',
                allowedQualities
            });
        }

        // 🔍 Lấy video data
        let videoData = null;
        let streamUid = null;
        let movieInfo = null;

        // Thử tìm episode trước
        const episode = await Episode.findById(videoId)
            .populate('movie_id', 'movie_title is_free price movie_type');
        
        if (episode) {
            videoData = episode;
            movieInfo = episode.movie_id;
            streamUid = extractStreamUid(episode.uri);
        } else {
            // Thử tìm movie
            const movie = await Movie.findById(videoId);
            if (movie) {
                movieInfo = movie;
                const ep = await Episode.findOne({ movie_id: videoId });
                if (ep && ep.uri) {
                    videoData = ep;
                    streamUid = extractStreamUid(ep.uri);
                }
            }
        }

        if (!streamUid) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại hoặc Stream UID không hợp lệ',
                code: 'INVALID_STREAM_UID'
            });
        }

        // 🔒 Kiểm tra quyền truy cập (phim có phí)
        if (!movieInfo.is_free && movieInfo.price > 0) {
            return res.status(403).json({
                status: 'error',
                message: 'Video này yêu cầu thanh toán',
                code: 'PAYMENT_REQUIRED'
            });
        }

        // 🎥 Lấy Stream URLs từ Cloudflare Stream
        const streamData = await cloudflareStreamService.getStreamUrl(streamUid, {
            quality: qualityLevel,
            format: 'auto'
        });

        if (streamData.status !== 'ready') {
            return res.status(202).json({
                status: 'processing',
                message: streamData.message,
                code: 'VIDEO_PROCESSING'
            });
        }

        // 🎯 Trả về URL theo quality được request
        let selectedVideoUrl = streamData.expo.uri; // Default HLS adaptive
        let selectedQuality = 'adaptive';

        if (qualityLevel !== 'auto') {
            // Map quality level to specific URL
            const qualityMap = {
                '360p': { url: streamData.expo.qualities.low, label: '360p (Low)' },
                '480p': { url: streamData.expo.qualities.medium, label: '480p (Medium)' },
                '720p': { url: streamData.expo.qualities.high, label: '720p (High)' }
            };

            const selectedQualityData = qualityMap[qualityLevel];
            if (selectedQualityData) {
                selectedVideoUrl = selectedQualityData.url;
                selectedQuality = selectedQualityData.label;
            }
        }

        // 📱 Response tối ưu cho quality switching
        return res.json({
            status: 'success',
            data: {
                videoId,
                requestedQuality: qualityLevel,
                selectedQuality,
                
                // 🎬 Video URL cho quality đã chọn
                video: {
                    uri: selectedVideoUrl,
                    fallbackUri: streamData.expo.fallbackUri,
                    poster: streamData.expo.poster,
                    thumbnail: streamData.expo.thumbnail,
                    subtitles: streamData.expo.subtitles || {},
                    duration: streamData.duration,
                    size: streamData.size
                },

                // 📊 Available qualities cho client switch
                availableQualities: {
                    auto: { url: streamData.expo.uri, label: 'Auto (Adaptive)' },
                    '360p': { url: streamData.expo.qualities.low, label: '360p (Low)' },
                    '480p': { url: streamData.expo.qualities.medium, label: '480p (Medium)' },
                    '720p': { url: streamData.expo.qualities.high, label: '720p (High)' }
                },

                // Movie info (minimal)
                movie: {
                    _id: movieInfo._id,
                    title: movieInfo.movie_title,
                    type: movieInfo.movie_type
                },

                // Episode info (nếu có)
                ...(videoData._id !== movieInfo._id && {
                    episode: {
                        _id: videoData._id,
                        title: videoData.episode_title,
                        number: videoData.episode_number
                    }
                })
            }
        });

    } catch (error) {
        console.error('❌ Get video quality URL error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy video URL với quality cụ thể',
            code: 'QUALITY_URL_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getVideoStreamUrl,
    refreshVideoStreamUrl,
    getVideoStatus,
    getVideoEmbed,
    getVideoSubtitle,
    getVideoQualityUrl
}; 