const User = require('../models/User');
const { uploadToCloudflare, deleteFromCloudflare } = require('../utils/cloudflare.config');
const mongoose = require('mongoose');

// Lấy thông tin profile (userId từ query params)
const getProfile = async (req, res) => {
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
const updateProfile = async (req, res) => {
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

                // Upload file mới lên Cloudflare Images và tạo placeholder avatar
                const imageData = await uploadToCloudflare(req.file, 'avatars', 'avatar');
                updateData.avatar = imageData.avatar; // Sử dụng placeholder avatar luôn hoạt động

                console.log('✅ Avatar updated successfully:', imageData.avatar);

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

// ❌ REMOVED: getUserMovieInteractions function
// Reason: Duplicate functionality with getMovieDetailWithInteractions
// Use getMovieDetailWithInteractions instead for movie detail screen

// 📊 NEW: Get user's interaction summary (for profile/dashboard)
// GET /api/users/{userId}/interactions/summary
const getUserInteractionsSummary = async (req, res) => {
    try {
        const { userId } = req.params;

        // Validate user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy user'
            });
        }

        // Import models
        const Rating = require('../models/Rating');
        const Favorite = require('../models/Favorite');
        const Watching = require('../models/Watching');

        // Get summary statistics in parallel
        const [
            totalRatings,
            totalLikes,
            totalFavorites,
            totalWatchingRecords,
            recentActivity
        ] = await Promise.all([
            // Total ratings given by user
            Rating.countDocuments({ user_id: userId }),
            
            // Total likes given by user
            Rating.countDocuments({ user_id: userId, is_like: true }),
            
            // Total movies in favorites
            Favorite.countDocuments({ user_id: userId }),
            
            // Total watching records
            Watching.countDocuments({ user_id: userId }),
            
            // Recent activity (last 10 interactions)
            Rating.find({ user_id: userId })
                .populate('movie_id', 'movie_title poster_path movie_type')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        // Get watching time statistics
        const watchingStats = await Watching.aggregate([
            { $match: { user_id: mongoose.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalWatchTime: { $sum: '$current_time' },
                    avgWatchPercentage: { $avg: '$watch_percentage' },
                    completedEpisodes: {
                        $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] }
                    }
                }
            }
        ]);

        const stats = watchingStats[0] || {
            totalWatchTime: 0,
            avgWatchPercentage: 0,
            completedEpisodes: 0
        };

        res.json({
            status: 'success',
            data: {
                userId,
                userName: user.full_name,
                
                // Activity counters
                stats: {
                    totalRatings,
                    totalLikes,
                    totalFavorites,
                    totalWatchingRecords,
                    completedEpisodes: stats.completedEpisodes,
                    totalWatchTime: Math.round(stats.totalWatchTime), // in seconds
                    totalWatchTimeFormatted: formatWatchTime(stats.totalWatchTime),
                    avgWatchPercentage: Math.round(stats.avgWatchPercentage || 0)
                },

                // Recent activity
                recentActivity: recentActivity.map(activity => ({
                    _id: activity._id,
                    movieId: activity.movie_id._id,
                    movieTitle: activity.movie_id.movie_title,
                    movieType: activity.movie_id.movie_type,
                    poster: activity.movie_id.poster_path,
                    action: activity.comment ? 'commented' : 'liked',
                    comment: activity.comment,
                    isLike: activity.is_like,
                    createdAt: activity.createdAt
                }))
            }
        });

    } catch (error) {
        console.error('Error getting user interactions summary:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy tổng kết tương tác người dùng',
            error: error.message
        });
    }
};


// API lấy trạng thái mute notification
const getNotificationMute = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Validation
    if (!userId) {
      console.error('❌ userId is required for getNotificationMute');
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('📱 Getting notification mute for user:', userId);

    const muteStatus = user.notificationMute || { isMuted: false, muteUntil: null };
    
    res.json({ 
      success: true, 
      data: muteStatus
    });
  } catch (err) {
    console.error('❌ Get mute failed:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Get mute failed',
      error: err.message 
    });
  }
};

// API cập nhật trạng thái mute notification
const updateNotificationMute = async (req, res) => {
  try {
    const { userId, isMuted, muteUntil } = req.body;

    
    // Validation
    if (!userId) {
      console.error('❌ userId is required for updateNotificationMute');
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    // Kiểm tra user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('🔄 Updating notification mute for user:', userId, { isMuted, muteUntil });


    let muteUntilValue = null;
    if (muteUntil && !isNaN(Number(muteUntil))) {
      const d = new Date(Number(muteUntil));
      if (!isNaN(d.getTime())) {
        muteUntilValue = d;
      }
    }
   


    // Cập nhật notificationMute
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      {
        notificationMute: {
          isMuted,
          muteUntil: muteUntilValue
        }
      },
      { new: true } // Trả về document đã được cập nhật
    );

    if (!updatedUser) {
      console.error('❌ Failed to update user notification mute');
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update notification mute' 
      });
    }

    console.log('✅ Notification mute updated successfully for user:', userId);
    res.json({ 
      success: true, 
      message: 'Notification mute updated successfully',
      data: {
        isMuted: updatedUser.notificationMute.isMuted,
        muteUntil: updatedUser.notificationMute.muteUntil
      }
    });
  } catch (err) {
    console.error('❌ Update mute failed:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Update mute failed',
      error: err.message 
    });
  }
};

// Helper function to format watch time
const formatWatchTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${Math.floor(seconds)}s`;
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getUserInteractionsSummary,

    getNotificationMute,

    updateNotificationMute
}; 