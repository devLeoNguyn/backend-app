const AWS = require('aws-sdk');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Cấu hình AWS S3
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const s3 = new AWS.S3();

// Cấu hình Multer để xử lý file upload
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Chỉ cho phép các loại file ảnh
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload file ảnh (jpeg, jpg, png, gif)'), false);
    }
};

// Giới hạn kích thước file (2MB)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

// Function upload file lên S3 (không dùng ACL)
const uploadToS3 = async (file, folder = 'assets/avatar-users') => {
    try {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype
            // Bỏ ACL vì bucket không cho phép
        };

        const result = await s3.upload(params).promise();
        return result.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Lỗi khi upload file lên S3: ' + error.message);
    }
};

// Function xóa file từ S3
const deleteFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl) return;
        
        // Extract key from URL
        const url = new URL(fileUrl);
        const key = url.pathname.substring(1); // Remove leading slash
        
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key
        };

        await s3.deleteObject(params).promise();
        console.log(`Deleted file: ${key}`);
    } catch (error) {
        console.error('S3 delete error:', error);
        // Không throw error để không ảnh hưởng đến quá trình chính
    }
};

// Function test connection S3
const testS3Connection = async () => {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME
        };
        
        await s3.headBucket(params).promise();
        console.log('✅ S3 connection successful');
        return true;
    } catch (error) {
        console.error('❌ S3 connection failed:', error.message);
        return false;
    }
};

module.exports = {
    upload,
    uploadToS3,
    deleteFromS3,
    testS3Connection,
    s3
}; 