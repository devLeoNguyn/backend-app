const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
    try {
        // Lấy userId từ query hoặc body (theo pattern hiện tại của movie app)
        // Support both userId and adminUserId for compatibility
        const userIdFromQuery = req.query.userId || req.query.adminUserId;
        const userIdFromBody = req.body.userId || req.body.adminUserId;
        const userIdToCheck = userIdFromBody || userIdFromQuery;
        
        if (!userIdToCheck) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required - userId or adminUserId missing'
            });
        }

        const user = await User.findById(userIdToCheck);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

module.exports = { requireAdmin }; 