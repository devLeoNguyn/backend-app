const Category = require('../models/Genre'); // Đã tạo Category model trong Genre.js
const Movie = require('../models/Movie');

/**
 * Lấy tất cả category cha và số lượng phim theo từng category (bao gồm cả con)
 * Trả về mảng categories, mỗi category có children (nếu có)
 */
exports.getAllCategories = async (req, res) => {
    try {
        // Lấy tất cả category cha (isParent: true)
        const parents = await Category.find({ isParent: true });
        const result = [];
        for (const parent of parents) {
            // Lấy category con của cha này
            const children = await Category.find({ parent: parent._id });
            // Lấy tất cả id (cha + con)
            const ids = [parent._id, ...children.map(c => c._id)];
            // Đếm số lượng phim thuộc các category này
            const count = await Movie.countDocuments({ categories: { $in: ids } });
            result.push({
                _id: parent._id,
                name: parent.name,
                description: parent.description,
                poster: parent.poster,
                isParent: true,
                movieCount: count,
                children: children.map(child => ({
                    _id: child._id,
                    name: child.name,
                    description: child.description,
                    poster: child.poster,
                    isParent: false
                }))
            });
        }
        // Trả về danh sách category cha và con, kèm số lượng phim
        res.json({ status: 'success', categories: result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Lấy phim theo categoryId (nếu là cha thì lấy cả phim của các con)
 * Query: categoryId
 * Nếu là cha: trả về phim của cha và các con
 * Nếu là con: chỉ trả về phim của con đó
 */
exports.getMoviesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.query;
        if (!categoryId) return res.status(400).json({ status: 'error', message: 'Thiếu categoryId' });
        // Tìm category theo id
        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).json({ status: 'error', message: 'Không tìm thấy category' });
        // Nếu là cha, lấy cả id các con
        let ids = [category._id];
        if (category.isParent) {
            const children = await Category.find({ parent: category._id });
            ids.push(...children.map(c => c._id));
        }
        // Tìm phim có categories thuộc ids
        const movies = await Movie.find({ categories: { $in: ids } })
            .select('movie_title description poster_path movie_type production_time')
            .sort({ createdAt: -1 });
        // Trả về kết quả
        res.json({
            status: 'success',
            category: { _id: category._id, name: category.name, isParent: category.isParent },
            total: movies.length,
            movies: movies.map(movie => ({
                _id: movie._id,
                title: movie.movie_title,
                description: movie.description,
                poster: movie.poster_path,
                movieType: movie.movie_type,
                productionTime: movie.production_time
            }))
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

// Lấy chỉ thể loại cha cho trang chủ
exports.getParentCategories = async (req, res) => {
    try {
        // Lấy tất cả category cha
        const parents = await Category.find({ isParent: true });
        const result = [];
        
        for (const parent of parents) {
            // Lấy category con
            const children = await Category.find({ parent: parent._id });
            // Lấy tất cả id (cha + con)
            const ids = [parent._id, ...children.map(c => c._id)];
            // Đếm số lượng phim thuộc các category này
            const count = await Movie.countDocuments({ genres: { $in: ids } });
            
            // Lấy danh sách phim (giới hạn 10 phim mới nhất)
            const movies = await Movie.find({ genres: { $in: ids } })
                .select('movie_title description poster_path movie_type production_time')
                .sort({ createdAt: -1 })
                .limit(10);
            
            result.push({
                _id: parent._id,
                name: parent.name,
                description: parent.description,
                poster: parent.poster,
                movieCount: count,
                movies: movies.map(movie => ({
                    _id: movie._id,
                    title: movie.movie_title,
                    description: movie.description,
                    poster: movie.poster_path,
                    movieType: movie.movie_type,
                    productionTime: movie.production_time
                }))
            });
        }
        
        res.json({ status: 'success', categories: result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
}; 