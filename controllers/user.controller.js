const User = require('../models/User');
const { uploadToCloudflare, deleteFromCloudflare } = require('../utils/cloudflare.config');

// Lấy thông tin profile (userId từ query params)
exports.getProfile = async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }

        const user = await User.findById(userId)
            .select('-__v');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy user'
            });
        }
        
        res.json({
            status: 'success',
            data: { 
                user: {
                    ...user.toObject(),
                    uid: user._id  // Thêm UID cho frontend hiển thị
                }
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy thông tin profile'
        });
    }
};

// Cập nhật profile (có thể kèm upload avatar)
exports.updateProfile = async (req, res) => {
    try {
        const { userId } = req.query;
        const { full_name, phone, gender } = req.body;
        
        console.log('📝 Update profile request:', {
            userId,
            full_name,
            phone,
            gender,
            hasFile: !!req.file
        });

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'userId là bắt buộc'
            });
        }

        // Tìm user hiện tại
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy user'
            });
        }

        const updateData = {};

        // Cập nhật các trường thông tin
        if (full_name) updateData.full_name = full_name;
        if (phone) updateData.phone = phone;
        if (gender !== undefined) updateData.gender = gender;

        // Xử lý upload avatar nếu có file
        if (req.file) {
            try {
                console.log('📤 Uploading avatar to Cloudflare:', {
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                });

                // Upload file mới lên Cloudflare Images
                const imageData = await uploadToCloudflare(req.file, 'avatars', 'avatar');
                updateData.avatar = imageData.avatar; // Sử dụng avatar variant URL

                console.log('✅ Avatar uploaded successfully to Cloudflare:', imageData.avatar);

                // Xóa avatar cũ nếu có
                if (user.avatar) {
                    console.log('🗑️ Deleting old avatar:', user.avatar);
                    await deleteFromCloudflare(user.avatar);
                }
            } catch (uploadError) {
                console.error('❌ Avatar upload error:', uploadError);
                return res.status(500).json({
                    status: 'error',
                    message: 'Lỗi khi upload avatar: ' + uploadError.message
                });
            }
        }

        // Kiểm tra số điện thoại đã tồn tại chưa
        if (phone) {
            const existingPhone = await User.findOne({ 
                phone, 
                _id: { $ne: userId } 
            });
            
            if (existingPhone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Số điện thoại đã được sử dụng'
                });
            }
        }

        // Cập nhật user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-__v');

        console.log('✅ User profile updated successfully');

        res.json({
            status: 'success',
            message: req.file ? 'Cập nhật profile và avatar thành công' : 'Cập nhật profile thành công',
            data: { 
                user: {
                    ...updatedUser.toObject(),
                    uid: updatedUser._id
                }
            }
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        
        // Xử lý lỗi file quá lớn
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: 'File quá lớn. Vui lòng chọn file nhỏ hơn 2MB'
            });
        }

        res.status(500).json({
            status: 'error',
            message: error.message || 'Lỗi khi cập nhật profile'
        });
    }
}; 