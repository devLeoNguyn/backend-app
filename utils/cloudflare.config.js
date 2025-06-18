const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// 🌐 Cấu hình Cloudflare
const CLOUDFLARE_CONFIG = {
    // Cloudflare Images & Stream - CHỈ CẦN 2 BIẾN NÀY
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    imagesApiUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    
    // Variants cho image optimization (public URLs)
    variants: {
        avatar: 'avatar',      // Avatar nhỏ: 150x150
        thumbnail: 'thumb',    // Thumbnail: 300x300  
        medium: 'medium',      // Medium: 800x600
        original: 'public'     // Original size
    }
};

// 📁 Cấu hình Multer cho file upload (memory storage)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // ✅ Chỉ cho phép các loại file ảnh
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh (jpeg, jpg, png, gif, webp)'), false);
    }
};

// 📊 Giới hạn kích thước file (5MB - cao hơn AWS vì Cloudflare Images free tier hỗ trợ tốt)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

/**
 * 🚀 Upload ảnh lên Cloudflare Images
 * @param {Object} file - File object từ multer
 * @param {string} folder - Folder name (metadata)
 * @param {string} variant - Image variant (avatar, thumbnail, medium, original)
 * @returns {Object} - Cloudflare Images response với URLs
 */
const uploadToCloudflare = async (file, folder = 'avatars', variant = 'avatar') => {
    try {
        // 🆔 Tạo unique ID cho file
        const fileId = `${folder}_${uuidv4()}`;
        
        // 📋 Tạo FormData cho Cloudflare Images API
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });
        
        // 🏷️ Metadata cho file
        formData.append('metadata', JSON.stringify({
            folder: folder,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
        }));
        
        // ⚙️ Cấu hình request
        const response = await axios.post(CLOUDFLARE_CONFIG.imagesApiUrl, formData, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                ...formData.getHeaders()
            }
        });

        if (response.data.success) {
            const imageData = response.data.result;
            
            // 🔗 Tạo URLs cho các variant (PUBLIC - không cần signature)
            const urls = {
                id: imageData.id,
                filename: imageData.filename,
                // Public URLs - truy cập trực tiếp không cần authentication
                original: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.accountId}/${imageData.id}/public`,
                avatar: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.accountId}/${imageData.id}/avatar`,
                thumbnail: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.accountId}/${imageData.id}/thumb`,
                medium: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.accountId}/${imageData.id}/medium`,
                uploaded: imageData.uploaded
            };
            
            console.log('✅ Cloudflare Images upload success:', {
                id: imageData.id,
                folder: folder,
                variant: variant,
                size: file.size
            });
            
            return urls;
            
        } else {
            throw new Error(`Cloudflare API error: ${JSON.stringify(response.data.errors)}`);
        }
        
    } catch (error) {
        console.error('❌ Cloudflare Images upload error:', error);
        
        if (error.response) {
            console.error('Response data:', error.response.data);
            throw new Error(`Cloudflare upload failed: ${error.response.data.errors?.[0]?.message || error.message}`);
        }
        
        throw new Error('Lỗi khi upload ảnh lên Cloudflare: ' + error.message);
    }
};

/**
 * 🗑️ Xóa ảnh từ Cloudflare Images
 * @param {string} imageUrl - URL hoặc ID của ảnh
 */
const deleteFromCloudflare = async (imageUrl) => {
    try {
        if (!imageUrl) return;
        
        // 🔍 Extract image ID từ URL
        let imageId;
        if (imageUrl.includes('imagedelivery.net')) {
            // URL format: https://imagedelivery.net/ACCOUNT_ID/IMAGE_ID/variant
            const urlParts = imageUrl.split('/');
            imageId = urlParts[urlParts.length - 2]; // ID nằm trước variant
        } else {
            // Giả sử là image ID trực tiếp
            imageId = imageUrl;
        }
        
        if (!imageId) {
            console.warn('⚠️ Không thể extract image ID từ URL:', imageUrl);
            return;
        }
        
        // 🗑️ Gọi Cloudflare API để xóa
        const response = await axios.delete(`${CLOUDFLARE_CONFIG.imagesApiUrl}/${imageId}`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
            }
        });
        
        if (response.data.success) {
            console.log(`✅ Deleted image: ${imageId}`);
        } else {
            console.error('❌ Failed to delete image:', response.data.errors);
        }
        
    } catch (error) {
        console.error('❌ Cloudflare Images delete error:', error);
        // Không throw error để không ảnh hưởng đến quá trình chính
    }
};

/**
 * 🔍 Test connection tới Cloudflare Images
 */
const testCloudflareConnection = async () => {
    try {
        // 📊 Test bằng cách lấy thống kê usage
        const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/images/v1/stats`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
            }
        });
        
        if (response.data.success) {
            console.log('✅ Cloudflare Images connection successful');
            console.log('📊 Current usage:', {
                allowedCount: response.data.result.count.allowed,
                currentCount: response.data.result.count.current
            });
            return true;
        } else {
            throw new Error(JSON.stringify(response.data.errors));
        }
        
    } catch (error) {
        console.error('❌ Cloudflare Images connection failed:', error.message);
        return false;
    }
};

/**
 * 🖼️ Lấy thông tin chi tiết của ảnh
 * @param {string} imageId - ID của ảnh
 */
const getImageDetails = async (imageId) => {
    try {
        const response = await axios.get(`${CLOUDFLARE_CONFIG.imagesApiUrl}/${imageId}`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
            }
        });
        
        if (response.data.success) {
            return response.data.result;
        } else {
            throw new Error(JSON.stringify(response.data.errors));
        }
        
    } catch (error) {
        console.error('❌ Get image details error:', error);
        throw new Error('Lỗi khi lấy thông tin ảnh: ' + error.message);
    }
};

/**
 * 📝 Lấy danh sách ảnh (cho admin)
 * @param {number} page - Trang (default: 1)
 * @param {number} per_page - Số lượng mỗi trang (default: 50, max: 100)
 */
const listImages = async (page = 1, per_page = 50) => {
    try {
        const response = await axios.get(`${CLOUDFLARE_CONFIG.imagesApiUrl}`, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`
            },
            params: {
                page,
                per_page: Math.min(per_page, 100)
            }
        });
        
        if (response.data.success) {
            return response.data.result;
        } else {
            throw new Error(JSON.stringify(response.data.errors));
        }
        
    } catch (error) {
        console.error('❌ List images error:', error);
        throw new Error('Lỗi khi lấy danh sách ảnh: ' + error.message);
    }
};

module.exports = {
    // 📤 Main functions
    upload,
    uploadToCloudflare,
    deleteFromCloudflare,
    testCloudflareConnection,
    
    // 🔧 Utility functions
    getImageDetails,
    listImages,
    
    // 📋 Configuration
    CLOUDFLARE_CONFIG
}; 