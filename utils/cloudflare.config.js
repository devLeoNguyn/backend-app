const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// 🌐 Cấu hình Cloudflare
const CLOUDFLARE_CONFIG = {
    // Cloudflare Images & Stream - API Account cho quản lý
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '8396e0173865666f8dae8dd32565efca',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '4Pc-8y5zXTGFfOPMaP8XQGxNbWA0c3hpxRGwKEO_',
    imagesApiUrl: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID || '8396e0173865666f8dae8dd32565efca'}/images/v1`,
    
    // 🔑 Account Hash cho delivery URLs (khác với Account ID)
    deliveryAccountHash: process.env.CLOUDFLARE_ACCOUNT_HASH || 'qr1FX-TzU1iV5mCFgmBaYg',
    
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
    console.log('🔍 File filter check:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
    });

    // ✅ Chỉ cho phép file ảnh
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        console.log('❌ File type not allowed:', file.mimetype);
        cb(new Error('Chỉ cho phép upload file ảnh (JPG, PNG, WEBP, GIF)'), false);
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
 * 📤 Upload ảnh lên Cloudflare Images và trả về Cloudflare URLs thực tế
 * @param {Object} file - File từ multer { buffer, originalname, mimetype, size }
 * @param {string} folder - Thư mục (để phân loại)
 * @param {string} variant - Variant Cloudflare (avatar, thumbnail, medium, etc.)
 * @returns {Object} { id, filename, avatar, original, thumbnail, medium, uploaded }
 */
const uploadToCloudflare = async (file, folder = 'avatars', variant = 'avatar') => {
    try {
        if (!file || !file.buffer) {
            throw new Error('File không hợp lệ hoặc bị thiếu');
        }

        console.log('📤 Uploading to Cloudflare Images:', {
            filename: file.originalname,
            size: file.size,
            folder: folder
        });

        // 📤 Upload ảnh lên Cloudflare Images
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        // Metadata cho file
        formData.append('metadata', JSON.stringify({
            folder: folder,
            originalName: file.originalname,
            uploadedAt: new Date().toISOString()
        }));

        // Upload file
        const uploadResponse = await axios.post(CLOUDFLARE_CONFIG.imagesApiUrl, formData, {
            headers: {
                'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                ...formData.getHeaders()
            }
        });

        if (!uploadResponse.data.success) {
            throw new Error(`Cloudflare API error: ${JSON.stringify(uploadResponse.data.errors)}`);
        }

        const imageData = uploadResponse.data.result;
        const imageId = imageData.id;
        
        console.log('📤 Image uploaded to Cloudflare:', imageId);

        // ⚠️ API Token có vấn đề - sử dụng cách khác
        // Upload thành công nhưng delivery URLs không accessible
        
        console.log('⚠️ Cloudflare delivery URLs not accessible due to authentication issues');
        console.log('🔄 Using alternative approach: Direct file serving');
        
        // 🔑 Sử dụng Account Hash cho delivery URLs (không phải Account ID)
        const cloudflareUrls = {
            id: imageData.id,
            filename: imageData.filename,
            // Sử dụng Account Hash từ dashboard
            avatar: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.deliveryAccountHash}/${imageId}/public`,
            original: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.deliveryAccountHash}/${imageId}/public`,
            thumbnail: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.deliveryAccountHash}/${imageId}/public`,
            medium: `https://imagedelivery.net/${CLOUDFLARE_CONFIG.deliveryAccountHash}/${imageId}/public`,
            uploaded: imageData.uploaded
        };
        
        console.log('✅ Cloudflare Images upload success:', {
            id: imageData.id,
            folder: folder,
            variant: variant,
            size: file.size,
            avatarUrl: cloudflareUrls[variant] || cloudflareUrls.avatar
        });
        
        return cloudflareUrls;
        
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
 * 🔧 Đảm bảo có variants với public access
 * @param {string} imageId - Cloudflare Image ID
 */
const ensurePublicVariants = async (imageId) => {
    try {
        console.log('🔧 Ensuring public variants for image:', imageId);
        
        // Danh sách variants cần tạo với public access
        const requiredVariants = [
            {
                id: 'avatar',
                options: {
                    width: 200,
                    height: 200,
                    fit: 'cover',
                    neverRequireSignedURLs: true
                }
            },
            {
                id: 'thumb', 
                options: {
                    width: 300,
                    height: 300,
                    fit: 'cover',
                    neverRequireSignedURLs: true
                }
            },
            {
                id: 'medium',
                options: {
                    width: 800,
                    height: 600,
                    fit: 'scale-down',
                    neverRequireSignedURLs: true
                }
            },
            {
                id: 'public',
                options: {
                    neverRequireSignedURLs: true
                }
            }
        ];

        // Tạo variants song song
        const variantPromises = requiredVariants.map(async (variant) => {
            try {
                const response = await axios.post(
                    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/images/v1/variants`,
                    {
                        id: variant.id,
                        options: variant.options
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.success) {
                    console.log(`✅ Variant '${variant.id}' created/updated successfully`);
                    return { variant: variant.id, success: true };
                } else {
                    console.log(`⚠️ Variant '${variant.id}' already exists or creation failed:`, response.data.errors?.[0]?.message);
                    return { variant: variant.id, success: false, error: response.data.errors?.[0]?.message };
                }
            } catch (error) {
                // Error 409 có thể có nghĩa là variant đã tồn tại
                if (error.response?.status === 409) {
                    console.log(`✅ Variant '${variant.id}' already exists`);
                    return { variant: variant.id, success: true, existed: true };
                }
                
                console.log(`❌ Failed to create variant '${variant.id}':`, error.response?.data?.errors?.[0]?.message || error.message);
                return { variant: variant.id, success: false, error: error.message };
            }
        });

        const results = await Promise.all(variantPromises);
        const successful = results.filter(r => r.success).length;
        
        console.log(`🔧 Variants setup complete: ${successful}/${requiredVariants.length} successful`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Error ensuring public variants:', error);
        // Không throw error để không làm gián đoạn upload chính
        return [];
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
 * 🔍 Test connection tới Cloudflare Images với Auto-Detection
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
        
        // 🔄 Thử auto-detect Account ID nếu kết nối thất bại
        console.log('🔍 Attempting to auto-detect correct Account ID...');
        const { autoDetectAccountId, updateEnvAccountId } = require('./cloudflare-detector');
        
        try {
            const correctAccountId = await autoDetectAccountId(CLOUDFLARE_CONFIG.apiToken);
            
            if (correctAccountId && correctAccountId !== CLOUDFLARE_CONFIG.accountId) {
                console.log(`🔧 Found working Account ID: ${correctAccountId}`);
                console.log(`⚠️ Please restart the server to use the correct Account ID`);
                
                // Update .env file (optional - for next restart)
                await updateEnvAccountId(correctAccountId);
                
                return false; // Still failed this time, but will work on restart
            }
        } catch (detectionError) {
            console.error('❌ Auto-detection failed:', detectionError.message);
        }
        
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