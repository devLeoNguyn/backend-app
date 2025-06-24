const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// Lấy tất cả category cha và số lượng phim theo từng category (bao gồm cả con)
router.get('/all', categoryController.getAllCategories);

// Lấy chỉ thể loại cha cho trang chủ
router.get('/parents', categoryController.getParentCategories);

// Lấy phim theo categoryId (bao gồm cả con nếu là cha)
router.get('/movies', categoryController.getMoviesByCategory);


module.exports = router; 