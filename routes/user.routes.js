const express = require('express');
const router = express.Router();
const { 
    getProfile,
    updateProfile
} = require('../controllers/user.controller');

// Get current user profile (userId từ query params)
router.get('/profile', getProfile);

// Update user profile (userId từ body)
router.put('/profile', updateProfile);

module.exports = router;
