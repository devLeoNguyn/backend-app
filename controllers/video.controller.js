const Episode = require('../models/Episode');
const Movie = require('../models/Movie');
const cloudfrontService = require('../services/cloudfront.service');

/**
 * 🎬 API cấp CloudFront Signed URL cho video streaming
 * GET /api/video-url/:videoId
 * 
 * videoId có thể là:
 * - episode_id (cho phim bộ)
 * - movie_id (cho phim lẻ)
 */
const getVideoStreamUrl = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { type = 'auto' } = req.query; // auto, episode, movie
        
        let videoData = null;
        let videoPath = null;
        let movieInfo = null;

        // Xác định loại video và lấy thông tin
        if (type === 'episode' || type === 'auto') {
            // Thử tìm episode trước
            const episode = await Episode.findById(videoId)
                .populate('movie_id', 'movie_title is_free price movie_type');
            
            if (episode) {
                videoData = episode;
                movieInfo = episode.movie_id;
                
                // Lấy video path từ URI (loại bỏ domain nếu có)
                if (episode.uri) {
                    videoPath = extractVideoPath(episode.uri);
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
                    videoPath = extractVideoPath(episode.uri);
                }
            }
        }

        // Validate data
        if (!videoData || !movieInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại',
                code: 'VIDEO_NOT_FOUND'
            });
        }

        if (!videoPath) {
            return res.status(404).json({
                status: 'error',
                message: 'Đường dẫn video không hợp lệ',
                code: 'INVALID_VIDEO_PATH'
            });
        }

        // Kiểm tra quyền truy cập (phim có phí)
        if (!movieInfo.is_free && movieInfo.price > 0) {
            // TODO: Kiểm tra user đã thanh toán chưa
            // Tạm thời return error cho phim có phí
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

        // Validate video path format
        if (!cloudfrontService.isValidVideoPath(videoPath)) {
            return res.status(400).json({
                status: 'error',
                message: 'Định dạng video không được hỗ trợ',
                code: 'UNSUPPORTED_VIDEO_FORMAT'
            });
        }

        // Tạo signed URL
        let signedUrlData;
        
        if (videoPath.endsWith('.m3u8')) {
            // HLS stream - cần signed URLs cho cả playlist và segments
            // Tính thời gian hết hạn tối ưu cho HLS
            const videoType = movieInfo.movie_type === 'Phim lẻ' ? 'movie' : 'series';
            const optimalMinutes = cloudfrontService.calculateOptimalExpiration(videoType, videoData.duration);
            
            signedUrlData = cloudfrontService.generateHLSSignedUrls(videoPath, optimalMinutes);
            
            return res.json({
                status: 'success',
                data: {
                    videoId,
                    type: 'hls',
                    movie: {
                        _id: movieInfo._id,
                        title: movieInfo.movie_title,
                        type: movieInfo.movie_type
                    },
                    episode: videoData._id !== movieInfo._id ? {
                        _id: videoData._id,
                        title: videoData.episode_title,
                        number: videoData.episode_number
                    } : null,
                    stream: {
                        url: signedUrlData.playlistUrl,
                        cookies: signedUrlData.cookies,
                        expiration: signedUrlData.expiration,
                        expiresIn: `${optimalMinutes} minutes`
                    }
                }
            });
            
        } else {
            // Single video file (MP4, etc.)
            const videoType = movieInfo.movie_type === 'Phim lẻ' ? 'movie' : 'series';
            const optimalMinutes = cloudfrontService.calculateOptimalExpiration(videoType, videoData.duration);
            const signedUrl = cloudfrontService.generateSignedUrl(videoPath, optimalMinutes);
            
            return res.json({
                status: 'success',
                data: {
                    videoId,
                    type: 'single',
                    movie: {
                        _id: movieInfo._id,
                        title: movieInfo.movie_title,
                        type: movieInfo.movie_type
                    },
                    episode: videoData._id !== movieInfo._id ? {
                        _id: videoData._id,
                        title: videoData.episode_title,
                        number: videoData.episode_number
                    } : null,
                    stream: {
                        url: signedUrl,
                        expiration: new Date(Date.now() + optimalMinutes * 60 * 1000).toISOString(),
                        expiresIn: `${optimalMinutes} minutes`
                    }
                }
            });
        }

    } catch (error) {
        console.error('Video streaming error:', error);
        
        // Xử lý các loại lỗi cụ thể
        if (error.message.includes('CloudFront configuration missing')) {
            return res.status(500).json({
                status: 'error',
                message: 'Cấu hình video streaming chưa đầy đủ',
                code: 'STREAMING_CONFIG_ERROR'
            });
        }
        
        if (error.message.includes('Failed to load CloudFront private key')) {
            return res.status(500).json({
                status: 'error',
                message: 'Lỗi cấu hình bảo mật video',
                code: 'SECURITY_CONFIG_ERROR'
            });
        }

        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo đường dẫn video',
            code: 'VIDEO_URL_GENERATION_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * 🔄 API làm mới Signed URL
 * POST /api/video-url/:videoId/refresh
 */
const refreshVideoStreamUrl = async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Gọi lại hàm getVideoStreamUrl với logic tương tự
        req.params.videoId = videoId;
        await getVideoStreamUrl(req, res);
        
    } catch (error) {
        console.error('Refresh video URL error:', error);
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
        
        // Tìm video info
        let videoData = null;
        let movieInfo = null;
        
        // Thử tìm episode
        const episode = await Episode.findById(videoId)
            .populate('movie_id', 'movie_title is_free price movie_type');
        
        if (episode) {
            videoData = episode;
            movieInfo = episode.movie_id;
        } else {
            // Thử tìm movie
            const movie = await Movie.findById(videoId);
            if (movie) {
                movieInfo = movie;
                const ep = await Episode.findOne({ movie_id: videoId });
                videoData = ep;
            }
        }

        if (!videoData || !movieInfo) {
            return res.status(404).json({
                status: 'error',
                message: 'Video không tồn tại'
            });
        }

        const hasVideoFile = !!videoData.uri;
        const isAccessible = movieInfo.is_free || movieInfo.price === 0;
        const videoPath = hasVideoFile ? extractVideoPath(videoData.uri) : null;
        const isValidFormat = videoPath ? cloudfrontService.isValidVideoPath(videoPath) : false;

        return res.json({
            status: 'success',
            data: {
                videoId,
                available: hasVideoFile && isValidFormat,
                accessible: isAccessible,
                requiresPayment: !isAccessible,
                format: videoPath ? (videoPath.endsWith('.m3u8') ? 'hls' : 'single') : null,
                movie: {
                    _id: movieInfo._id,
                    title: movieInfo.movie_title,
                    type: movieInfo.movie_type,
                    price: movieInfo.price,
                    isFree: movieInfo.is_free
                }
            }
        });

    } catch (error) {
        console.error('Video status error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi khi kiểm tra trạng thái video'
        });
    }
};

/**
 * Helper: Trích xuất video path từ full URL
 * @param {string} uri - Full URL hoặc relative path
 * @returns {string} Relative video path
 */
function extractVideoPath(uri) {
    if (!uri) return null;
    
    // Nếu là full URL, extract path
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
        try {
            const url = new URL(uri);
            return url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        } catch (error) {
            console.error('Invalid URL format:', uri);
            return null;
        }
    }
    
    // Nếu đã là relative path
    return uri.startsWith('/') ? uri.substring(1) : uri;
}

module.exports = {
    getVideoStreamUrl,
    refreshVideoStreamUrl,
    getVideoStatus
}; 