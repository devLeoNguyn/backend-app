const express = require('express');
const router = express.Router();
const { 
    getProfile,
    updateProfile
} = require('../controllers/user.controller');
const { upload } = require('../utils/cloudflare.config');

// Get current user profile (userId từ query params)
router.get('/profile', getProfile);

// Update user profile (có thể kèm upload avatar - userId từ query params, file từ form-data)
router.put('/profile', upload.single('avatar'), updateProfile);

module.exports = router;
