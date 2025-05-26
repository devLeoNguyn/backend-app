const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function để lấy token từ header
const getTokenFromHeader = (headers) => {
    const authHeader = headers['authorization'];
    return authHeader && authHeader.split(' ')[1];
};

// Helper function để verify token và lấy decoded data
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
    try {
        return jwt.verify(token, secret);
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Token không hợp lệ');
        }
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token đã hết hạn');
        }
        throw error;
    }
};

// Helper function để tìm user từ decoded token
const findUserFromToken = async (decoded) => {
    const user = await User.findById(decoded.user_id).select('-password'); //-password xử lý sau nếu thêm vào đăng nhập 
    if (!user) {
        throw new Error('User không tồn tại');
    }
    return user;
};

// Middleware xác thực JWT token - bắt buộc
exports.authenticateToken = async (req, res, next) => {
    try {
        const token = getTokenFromHeader(req.headers);
        
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Vui lòng đăng nhập để thực hiện chức năng này' //su dung cho role user thay vi user vang lai
            });
        }

        const decoded = verifyToken(token);
        const user = await findUserFromToken(decoded);
        
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            status: 'error',
            message: error.message
        });
    }
};

// Middleware xác thực JWT token - tùy chọn
exports.optionalAuth = async (req, res, next) => {
    try {
        const token = getTokenFromHeader(req.headers);
        
        if (token) {
            const decoded = verifyToken(token);
            const user = await findUserFromToken(decoded);
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Bỏ qua lỗi token cho optional auth
        next();
    }
};

// Helper function để tạo access token
exports.generateToken = (user) => {
    const payload = {
        user_id: user._id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name
    };
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// Helper function để tạo refresh token
exports.generateRefreshToken = (user) => {
    return jwt.sign(
        { user_id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
};

// Helper function để verify refresh token
exports.verifyRefreshToken = (token) => {
    try {
        return verifyToken(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Refresh token không hợp lệ');
    }
};
 