const axios = require('axios');
const FormData = require('form-data');

class CloudflareStreamService {
    constructor() {
        // 🌐 Cloudflare Stream configuration - CHỈ CẦN 2 BIẾN MÔI TRƯỜNG
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
        this.streamApiUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`;
        
        // ⚙️ Stream settings tối ưu cost cho gói $5 (PUBLIC STREAMING)
        this.streamSettings = {
            // Public streaming - không cần signed URLs để tiết kiệm cost
            requireSignedURLs: false,
            allowedOrigins: ['*'], // Public access
            watermark: null,
            
            // Quality settings để control cost
            qualitySettings: {
                mp4Support: true,
                allowAudio: true,
                maxResolution: '720p', // Limit 720p để tiết kiệm bandwidth
                thumbnailTimestampPct: 0.5
            }
        };

        // Validate configuration
        if (!this.accountId || !this.apiToken) {
            throw new Error('Cloudflare Stream configuration missing. Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in environment variables.');
        }
    }

    /**
     * 🚀 Upload video lên Cloudflare Stream
     * @param {Object} options - Upload options
     * @returns {Object} - Upload response với stream data
     */
    async uploadVideo(options = {}) {
        try {
            const {
                videoBuffer,
                filename,
                metadata = {},
                requireSignedURLs = false,
                allowedOrigins = ['*'],
                watermark = null
            } = options;

            // 📋 Tạo FormData cho upload
            const formData = new FormData();
            
            if (videoBuffer) {
                formData.append('file', videoBuffer, filename);
            } else if (options.url) {
                // Upload từ URL
                formData.append('url', options.url);
            } else {
                throw new Error('Cần cung cấp videoBuffer hoặc URL');
            }

            // 🏷️ Metadata
            formData.append('meta', JSON.stringify({
                name: filename,
                ...metadata,
                uploadedAt: new Date().toISOString()
            }));

            // 🔒 Security settings
            formData.append('requireSignedURLs', requireSignedURLs.toString());
            formData.append('allowedOrigins', JSON.stringify(allowedOrigins));
            
            if (watermark) {
                formData.append('watermark', JSON.stringify(watermark));
            }

            // 📤 Upload request
            const response = await axios.post(this.streamApiUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    ...formData.getHeaders()
                },
                timeout: 300000 // 5 phút timeout cho video upload
            });

            if (response.data.success) {
                const streamData = response.data.result;
                
                console.log('✅ Cloudflare Stream upload success:', {
                    uid: '[REDACTED]',
                    status: streamData.status,
                    duration: streamData.duration,
                    size: streamData.size
                });

                return {
                    uid: streamData.uid,
                    status: streamData.status,
                    playback: streamData.playback,
                    preview: streamData.preview,
                    thumbnail: streamData.thumbnail,
                    duration: streamData.duration,
                    size: streamData.size,
                    created: streamData.created,
                    modified: streamData.modified,
                    meta: streamData.meta,
                    
                    // 🔗 HLS Manifest URL for direct streaming
                    hlsManifestUrl: this.generateHLSManifestUrl(streamData.uid)
                };
            } else {
                throw new Error(`Cloudflare Stream API error: ${JSON.stringify(response.data.errors)}`);
            }

        } catch (error) {
            console.error('❌ Cloudflare Stream upload error:', error);
            
            if (error.response) {
                console.error('Response data:', error.response.data);
                throw new Error(`Stream upload failed: ${error.response.data.errors?.[0]?.message || error.message}`);
            }
            
            throw new Error('Lỗi khi upload video lên Cloudflare Stream: ' + error.message);
        }
    }

    /**
     * 🔗 Generate HLS Manifest URL từ Stream UID
     * @param {string} streamUid - Cloudflare Stream UID
     * @returns {string} - HLS Manifest URL
     */
    generateHLSManifestUrl(streamUid) {
        const customerDomain = process.env.CUSTOMER_DOMAIN_URL || `customer-${this.accountId}.cloudflarestream.com`;
        return `https://${customerDomain}/${streamUid}/manifest/video.m3u8`;
    }

    /**
     * 🎬 Lấy stream URL cho video
     * @param {string} videoUid - UID của video trong Cloudflare Stream
     * @param {Object} options - Playback options
     * @returns {Object} - Stream URLs và thông tin
     */
    async getStreamUrl(videoUid, options = {}) {
        try {
            const { 
                quality = 'auto',
                format = 'auto', // auto, hls, dash
                startTime = 0
            } = options;

            // 📊 Lấy thông tin video và captions
            const [videoResponse, captionsData] = await Promise.all([
                axios.get(`${this.streamApiUrl}/${videoUid}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`
                    }
                }),
                this.getVideoCaptions(videoUid)
            ]);

            if (!videoResponse.data.success) {
                throw new Error(`Video not found: ${videoUid}`);
            }

            const videoData = videoResponse.data.result;

            // ⚠️ Kiểm tra status
            if (videoData.status !== 'ready') {
                return {
                    status: videoData.status,
                    message: this.getStatusMessage(videoData.status),
                    progress: videoData.status === 'inprogress' ? 'Processing...' : null
                };
            }

            // 🔗 Tạo stream URLs tối ưu cho EXPO APP (mobile-first)
            const customerDomain = process.env.CUSTOMER_DOMAIN_URL || `customer-${this.accountId}.cloudflarestream.com`;
            const streamUrls = {
                // 📱 HLS - PRIMARY cho Expo/React Native
                hls: `https://${customerDomain}/${videoUid}/manifest/video.m3u8`,
                
                // 🎬 MP4 fallback cho Expo Video component
                mp4: `https://${customerDomain}/${videoUid}/manifest/video.mp4`,
                
                // 📱 Mobile-optimized MP4 qualities
                mp4_mobile: {
                    '360p': `https://${customerDomain}/${videoUid}/manifest/video.mp4?quality=360p`,
                    '480p': `https://${customerDomain}/${videoUid}/manifest/video.mp4?quality=480p`,
                    '720p': `https://${customerDomain}/${videoUid}/manifest/video.mp4?quality=720p`
                },
                
                // 🖼️ Thumbnails for mobile
                thumbnail: `https://${customerDomain}/${videoUid}/thumbnails/thumbnail.jpg`,
                poster: `https://${customerDomain}/${videoUid}/thumbnails/thumbnail.jpg?time=5s`
            };

            return {
                status: 'ready',
                videoUid,
                duration: videoData.duration,
                size: videoData.size,
                created: videoData.created,
                meta: videoData.meta,
                
                // 📱 SIMPLIFIED RESPONSE cho Expo app
                expo: {
                    // Primary URL cho Expo AV component
                    uri: streamUrls.hls, // HLS adaptive streaming
                    fallbackUri: streamUrls.mp4, // MP4 fallback
                    
                    // Mobile qualities
                    qualities: {
                        low: streamUrls.mp4_mobile['360p'],
                        medium: streamUrls.mp4_mobile['480p'], 
                        high: streamUrls.mp4_mobile['720p']
                    },
                    
                    // Images cho app
                    poster: streamUrls.poster,
                    thumbnail: streamUrls.thumbnail,
                    
                    // 📋 Subtitles cho Expo Video
                    subtitles: captionsData.subtitles
                },
                
                // 📋 Subtitle info  
                captions: {
                    available: captionsData.available,
                    subtitles: captionsData.subtitles
                },
                
                // Full URLs (nếu cần customize)
                urls: streamUrls
            };

        } catch (error) {
            console.error('❌ Get stream URL error:', error);
            throw new Error('Lỗi khi lấy stream URL: ' + error.message);
        }
    }

    /**
     * 📊 Lấy thông tin chi tiết video
     * @param {string} videoUid - UID của video
     */
    async getVideoDetails(videoUid) {
        try {
            const response = await axios.get(`${this.streamApiUrl}/${videoUid}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.data.success) {
                return response.data.result;
            } else {
                throw new Error(JSON.stringify(response.data.errors));
            }

        } catch (error) {
            console.error('❌ Get video details error:', error);
            throw new Error('Lỗi khi lấy thông tin video: ' + error.message);
        }
    }

    /**
     * 🗑️ Xóa video từ Cloudflare Stream
     * @param {string} videoUid - UID của video
     */
    async deleteVideo(videoUid) {
        try {
            const response = await axios.delete(`${this.streamApiUrl}/${videoUid}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.data.success) {
                console.log(`✅ Deleted video: ${videoUid}`);
                return true;
            } else {
                throw new Error(JSON.stringify(response.data.errors));
            }

        } catch (error) {
            console.error('❌ Delete video error:', error);
            // Không throw error để không ảnh hưởng đến quá trình chính
            return false;
        }
    }

    /**
     * 📝 Lấy danh sách videos
     * @param {Object} options - List options
     */
    async listVideos(options = {}) {
        try {
            const {
                search = '',
                status = '',
                after = '',
                before = '',
                limit = 50
            } = options;

            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (status) params.append('status', status);
            if (after) params.append('after', after);
            if (before) params.append('before', before);
            if (limit) params.append('limit', Math.min(limit, 1000));

            const response = await axios.get(`${this.streamApiUrl}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.data.success) {
                return response.data.result;
            } else {
                throw new Error(JSON.stringify(response.data.errors));
            }

        } catch (error) {
            console.error('❌ List videos error:', error);
            throw new Error('Lỗi khi lấy danh sách videos: ' + error.message);
        }
    }

    /**
     * 🔍 Test connection tới Cloudflare Stream
     */
    async testConnection() {
        try {
            // Test bằng cách lấy danh sách videos với limit 1
            const response = await axios.get(`${this.streamApiUrl}?limit=1`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.data.success) {
                console.log('✅ Cloudflare Stream connection successful');
                console.log('📊 Account has', response.data.result.length, 'videos');
                return true;
            } else {
                throw new Error(JSON.stringify(response.data.errors));
            }

        } catch (error) {
            console.error('❌ Cloudflare Stream connection failed:', error.message);
            return false;
        }
    }

    /**
     * 💰 Lấy thông tin usage để theo dõi cost
     */
    async getUsageStats() {
        try {
            // Lấy analytics data
            const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/analytics/views`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                },
                params: {
                    dimensions: 'datetime',
                    metrics: 'videoPlaybackMinutes',
                    since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
                }
            });

            if (response.data.success) {
                const data = response.data.result;
                const totalMinutes = data.data.reduce((sum, item) => sum + item[1], 0);
                
                return {
                    totalPlaybackMinutes: totalMinutes,
                    estimatedCost: this.calculateEstimatedCost(totalMinutes),
                    period: '30 days',
                    data: data.data
                };
            } else {
                throw new Error(JSON.stringify(response.data.errors));
            }

        } catch (error) {
            console.error('❌ Get usage stats error:', error);
            return {
                totalPlaybackMinutes: 0,
                estimatedCost: 0,
                error: error.message
            };
        }
    }

    /**
     * 💵 Tính toán estimated cost
     * @param {number} minutes - Số phút streaming
     */
    calculateEstimatedCost(minutes) {
        // Cloudflare Stream pricing: $1 per 1000 minutes delivered
        // Gói $5 bao gồm 5000 minutes/month
        const costPerThousandMinutes = 1;
        const freeMinutesInPlan = 5000; // Gói $5
        
        if (minutes <= freeMinutesInPlan) {
            return 0; // Trong gói
        }
        
        const overageMinutes = minutes - freeMinutesInPlan;
        return (overageMinutes / 1000) * costPerThousandMinutes;
    }

    /**
     * 📄 Get status message
     */
    getStatusMessage(status) {
        const messages = {
            'inprogress': 'Video đang được xử lý, vui lòng chờ...',
            'ready': 'Video sẵn sàng để phát',
            'error': 'Có lỗi xảy ra khi xử lý video',
            'pending': 'Video đang chờ xử lý'
        };
        
        return messages[status] || `Trạng thái: ${status}`;
    }

    /**
     * 🎬 Generate embed HTML for video player
     * @param {string} videoUid - UID của video
     * @param {Object} options - Player options
     */
    generateEmbedHTML(videoUid, options = {}) {
        const {
            width = '100%',
            height = 'auto',
            autoplay = false,
            muted = false,
            loop = false,
            controls = true,
            preload = 'metadata'
        } = options;

        const streamUrl = `https://customer-${this.accountId}.cloudflarestream.com/${videoUid}`;
        
        return `
<stream 
    src="${streamUrl}"
    ${width !== 'auto' ? `width="${width}"` : ''}
    ${height !== 'auto' ? `height="${height}"` : ''}
    ${controls ? 'controls' : ''}
    ${autoplay ? 'autoplay' : ''}
    ${muted ? 'muted' : ''}
    ${loop ? 'loop' : ''}
    preload="${preload}">
</stream>
<script data-cfasync="false" defer type="text/javascript" src="https://embed.cloudflarestream.com/embed/r4xu.fla9.latest.js"></script>
        `.trim();
    }

    /**
     * 📋 Lấy danh sách captions từ Cloudflare Stream
     * @param {string} videoUid - UID của video
     * @returns {Object} - Captions data
     */
    async getVideoCaptions(videoUid) {
        try {
            const response = await axios.get(`${this.streamApiUrl}/${videoUid}/captions`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (response.data.success) {
                const captions = response.data.result;
                
                // 🎬 Tạo subtitle URLs cho Expo app
                const subtitles = {};
                
                captions.forEach(caption => {
                    if (caption.status === 'ready') {
                        subtitles[caption.language] = {
                            label: caption.label,
                            language: caption.language,
                            // WebVTT URL cho subtitle
                            uri: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${videoUid}/captions/${caption.language}/vtt`,
                            generated: caption.generated || false
                        };
                    }
                });

                return {
                    available: captions.length > 0,
                    subtitles,
                    // Raw captions data (for debugging)
                    _raw: captions
                };
            } else {
                throw new Error(`Captions API error: ${JSON.stringify(response.data.errors)}`);
            }

        } catch (error) {
            console.error('❌ Get captions error:', error);
            
            // Return empty subtitles if captions not available
            return {
                available: false,
                subtitles: {},
                _raw: []
            };
        }
    }

    /**
     * 📋 Lấy file WebVTT subtitle cho language cụ thể 
     * @param {string} videoUid - UID của video
     * @param {string} language - Language code (vi, en, etc.)
     * @returns {string} - WebVTT content
     */
    async getCaptionContent(videoUid, language) {
        try {
            const response = await axios.get(`${this.streamApiUrl}/${videoUid}/captions/${language}/vtt`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            return response.data; // WebVTT content as string

        } catch (error) {
            console.error(`❌ Get caption content error for ${language}:`, error);
            throw new Error(`Không thể lấy subtitle ${language}: ${error.message}`);
        }
    }
}

module.exports = new CloudflareStreamService(); 