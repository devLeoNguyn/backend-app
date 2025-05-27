const User = require('../models/User');

// Lấy thông tin profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-__v');
        
        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy thông tin profile'
        });
    }
};

// Cập nhật profile
exports.updateProfile = async (req, res) => {
    try {
        const { full_name, phone, avatar } = req.body;
        const updateData = {};

        // Chỉ cập nhật các trường được gửi lên
        if (full_name) updateData.full_name = full_name;
        if (phone) updateData.phone = phone;
        if (avatar !== undefined) updateData.avatar = avatar; // Cho phép gửi null để xóa avatar

        // Kiểm tra số điện thoại đã tồn tại chưa
        if (phone) {
            const existingPhone = await User.findOne({ 
                phone, 
                _id: { $ne: req.user._id } 
            });
            
            if (existingPhone) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Số điện thoại đã được sử dụng'
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select('-__v');

        if (!updatedUser) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy user'
            });
        }

        res.json({
            status: 'success',
            message: 'Cập nhật profile thành công',
            data: { user: updatedUser }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật profile'
        });
    }
}; 