const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
    try {
        // Lấy userId từ query hoặc body (theo pattern hiện tại của movie app)
        const { userId, adminUserId } = req.query || req.body;
        const userIdToCheck = adminUserId || userId;
        
        if (!userIdToCheck) {
            return res.status(401).json({
                status: 'error',
                message: 'Admin authentication required - userId missing'
            });
        }

        const user = await User.findById(userIdToCheck);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin access required'
            });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Authentication error'
        });
    }
};

module.exports = { requireAdmin }; 