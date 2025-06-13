const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

class CloudFrontService {
    constructor() {
        // CloudFront configuration từ env
        this.cloudfrontDistribution = process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN;
        this.keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
        this.privateKeyPath = process.env.CLOUDFRONT_PRIVATE_KEY_PATH || path.join(__dirname, '../keys/cloudfront-private-key.pem');
        
        // Validate configuration
        if (!this.cloudfrontDistribution || !this.keyPairId) {
            throw new Error('CloudFront configuration missing. Please set CLOUDFRONT_DISTRIBUTION_DOMAIN and CLOUDFRONT_KEY_PAIR_ID in environment variables.');
        }

        // Load private key
        try {
            this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
        } catch (error) {
            throw new Error(`Failed to load CloudFront private key from ${this.privateKeyPath}: ${error.message}`);
        }

        // Initialize CloudFront signer
        this.signer = new AWS.CloudFront.Signer(this.keyPairId, this.privateKey);
    }

    /**
     * Tính toán thời gian hết hạn tối ưu dựa trên loại video và thời lượng
     * @param {string} videoType - 'movie' hoặc 'series'
     * @param {number} duration - Thời lượng video (phút)
     * @returns {number} Thời gian hết hạn tối ưu (phút)
     */
    calculateOptimalExpiration(videoType, duration) {
        // Thời gian cơ bản
        const baseTimes = {
            movie: 120,    // 2 giờ cho phim lẻ
            series: 60     // 1 giờ cho phim bộ
        };
        
        const baseTime = baseTimes[videoType] || baseTimes.series;
        
        // Nếu có thông tin thời lượng, điều chỉnh theo tỷ lệ
        if (duration && duration > 0) {
            // Thêm 50% thời gian dự phòng, tối thiểu 30 phút
            const bufferTime = Math.max(duration * 0.5, 30);
            return Math.min(duration + bufferTime, 180); // Tối đa 3 giờ
        }
        
        return baseTime;
    }

    /**
     * Tạo CloudFront Signed URL cho video
     * @param {string} videoPath - Đường dẫn video tương đối (vd: "hls-output/spiderman1.m3u8")
     * @param {number} expirationMinutes - Thời gian hết hạn (phút), mặc định 45 phút
     * @returns {string} Signed URL
     */
    generateSignedUrl(videoPath, expirationMinutes = 45) {
        try {
            // Tạo full URL
            const videoUrl = `https://${this.cloudfrontDistribution}/${videoPath}`;
            
            // Thời gian hết hạn (45 phút từ bây giờ)
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + expirationMinutes);
            
            // Tạo signed URL
            const signedUrl = this.signer.getSignedUrl({
                url: videoUrl,
                expires: Math.floor(expiration.getTime() / 1000), // AWS yêu cầu timestamp tính bằng giây
            });

            return signedUrl;
        } catch (error) {
            throw new Error(`Failed to generate signed URL: ${error.message}`);
        }
    }

    /**
     * Tạo Signed URL cho cả playlist và segments
     * @param {string} playlistPath - Đường dẫn đến file .m3u8
     * @param {number} expirationMinutes - Thời gian hết hạn
     * @returns {Object} Object chứa signed URLs cho playlist và policy cho segments
     */
    generateHLSSignedUrls(playlistPath, expirationMinutes = 45) {
        try {
            // Tạo expiration timestamp
            const expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + expirationMinutes);
            const expirationTimestamp = Math.floor(expiration.getTime() / 1000);

            // URL cho playlist (.m3u8)
            const playlistUrl = `https://${this.cloudfrontDistribution}/${playlistPath}`;
            const signedPlaylistUrl = this.signer.getSignedUrl({
                url: playlistUrl,
                expires: expirationTimestamp
            });

            // Tạo policy cho tất cả segments trong cùng thư mục
            const basePath = playlistPath.substring(0, playlistPath.lastIndexOf('/'));
            const resourcePattern = `https://${this.cloudfrontDistribution}/${basePath}/*`;
            
            const signedCookies = this.signer.getSignedCookie({
                url: resourcePattern,
                expires: expirationTimestamp
            });

            return {
                playlistUrl: signedPlaylistUrl,
                cookies: signedCookies,
                expiration: expiration.toISOString(),
                expirationTimestamp
            };
        } catch (error) {
            throw new Error(`Failed to generate HLS signed URLs: ${error.message}`);
        }
    }

    /**
     * Validate video path format
     * @param {string} videoPath 
     * @returns {boolean}
     */
    isValidVideoPath(videoPath) {
        // Basic validation cho video path
        const validExtensions = ['.m3u8', '.ts', '.mp4'];
        const hasValidExtension = validExtensions.some(ext => videoPath.toLowerCase().endsWith(ext));
        
        // Không được chứa ký tự nguy hiểm
        const dangerousChars = ['..', '//', '\\'];
        const hasDangerousChars = dangerousChars.some(char => videoPath.includes(char));
        
        return hasValidExtension && !hasDangerousChars;
    }
}

module.exports = new CloudFrontService(); 