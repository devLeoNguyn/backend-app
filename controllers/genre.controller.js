const { create } = require('hbs');
const Genre = require('../models/Genre');
const Movie = require('../models/Movie');
const {
    createResponse,
    getGenreMovieCount,
    getGenreBasicInfo,
    getGenreFullInfo,
    getChildrenGenres,
    updateGenreStatus
} = require('../utils/genreHelpers');

// === PUBLIC ROUTES ===

/**
 * Lấy danh sách thể loại với nhiều options
 * GET /api/genres
 * Query params:
 * - type: 'all' | 'parent' | 'active' (default: 'all')
 * - include_poster: boolean (default: true)
 * - include_children: boolean (default: true)
 * - format: 'tree' | 'list' (default: 'tree')**/
const getGenres = async (req, res) => {
    try {
        const type = req.query.type || 'all';

        // Luôn trả về poster, children, tree
        const include_poster = true;
        const include_children = true;
        const format = 'tree';

        let query = {};
        if (type === 'parent') query.parent_genre = null;
        if (type === 'active') query.is_active = true;
        if (type === 'children' && req.query.parent_id) {
            query.parent_genre = req.query.parent_id;
        }
        const genres = await Genre.find(query)
            .select(include_poster ? '+poster' : '-poster')
            .sort({ sort_order: 1, genre_name: 1 });

        let formattedGenres = await Promise.all(
            genres.map(async (genre) => {
                const genreInfo = await getGenreFullInfo(genre, true);
                // Chỉ thêm children khi type KHÔNG phải là 'parent'
                if (include_children && type !== 'parent') {
                    genreInfo.children = await getChildrenGenres(genre._id);
                }
                return genreInfo;
            })
        );

        res.json(createResponse({
            genres: formattedGenres,
            total: formattedGenres.length,
            type
        }));
    } catch (error) {
        console.error('Get genres error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại',
            error: error.message
        });
    }
};

/**
 * Lấy danh sách phim của một thể loại
 * GET /api/genres/:genreId/movies
 */
const getGenreMovies = async (req, res) => {
    try {
        const { genreId } = req.params;
        const { 
            include_children = 'false', 
            page = 1, 
            limit = 10,
            sort = '-createdAt'  // Thêm tham số sắp xếp
        } = req.query;

        // Kiểm tra thể loại tồn tại
        const genre = await Genre.findById(genreId);
        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        // Lấy danh sách ID thể loại (bao gồm cả thể loại con nếu được yêu cầu)
        let genreIds = [genreId];
        if (include_children === 'true' && genre.is_parent) {
            const childGenres = await Genre.find({ 
                parent_genre: genreId, 
                is_active: true 
            }).select('_id');
            genreIds.push(...childGenres.map(child => child._id));
        }

        // Tính toán skip cho pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Lấy danh sách phim với đầy đủ thông tin
        const movies = await Movie.find({ 
            genres: { $in: genreIds },
            release_status: 'released' // Chỉ hiển thị phim đã phát hành
        })
            .populate('genres', 'genre_name')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Đếm tổng số phim
        const total = await Movie.countDocuments({ 
            genres: { $in: genreIds },
            release_status: 'released' // Chỉ đếm phim đã phát hành
        });

        // Tính tổng số trang
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            status: 'success',
            data: {
                movies,
            pagination: {
                    total,
                    page: parseInt(page),
                    totalPages,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Get genre movies error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách phim của thể loại',
            error: error.message
        });
    }
};

// === ADMIN ROUTES ===

/**
 * Tạo thể loại mới
 * POST /api/genres
 */
const createGenre = async (req, res) => {
    try {
        const { genre_name, description, poster, parent_genre_id, sort_order } = req.body;

        // Kiểm tra tên thể loại đã tồn tại
        const existingGenre = await Genre.findOne({ 
            genre_name: { $regex: new RegExp(`^${genre_name}$`, 'i') }
        });

        if (existingGenre) {
            return res.status(400).json({
                status: 'error',
                message: 'Tên thể loại này đã tồn tại'
            });
        }

        // Tạo thể loại mới
        const newGenre = new Genre({
            genre_name: genre_name.trim(),
            description: description ? description.trim() : '',
            poster: poster || '',
            parent_genre: parent_genre_id || null,
            is_parent: !parent_genre_id,
            sort_order: sort_order || 0
        });

        await newGenre.save();

        // Nếu là thể loại con, populate thông tin parent
        if (parent_genre_id) {
            await newGenre.populate('parent_genre', 'genre_name description');
        }

        res.status(201).json(createResponse(
            { genre: newGenre },
            'Đã tạo thể loại thành công'
        ));
    } catch (error) {
        console.error('Create genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo thể loại',
            error: error.message
        });
    }
};

/**
 * Cập nhật thể loại
 * PUT /api/genres/:id
 */
const updateGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { genre_name, description, poster, sort_order } = req.body;

        const genre = await Genre.findByIdAndUpdate(
            id,
            { 
                genre_name, 
                description,
                poster: poster || '',
                sort_order
            },
            { new: true, runValidators: true }
        );

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json(createResponse(
            { genre },
            'Đã cập nhật thể loại thành công'
        ));
    } catch (error) {
        console.error('Update genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật thể loại',
            error: error.message
        });
    }
};

/**
 * Cập nhật trạng thái thể loại
 * PUT /api/genres/:id/status
 */
const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;

        if (!['activate', 'deactivate', 'toggle'].includes(action)) {
            return res.status(400).json({
                status: 'error',
                message: 'Action không hợp lệ'
            });
        }

        const result = await updateGenreStatus(id, action);
        
        res.json(createResponse(
            result,
            `Đã ${action === 'activate' ? 'kích hoạt' : 'vô hiệu hóa'} thể loại thành công`
        ));
    } catch (error) {
        console.error('Update genre status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật trạng thái thể loại',
            error: error.message
        });
    }
};

/**
 * Xóa thể loại
 * DELETE /api/genres/:id
 */
const deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra có phim nào đang sử dụng thể loại
        const movieCount = await getGenreMovieCount(id, true);
        if (movieCount > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Không thể xóa thể loại này vì đang được sử dụng bởi một số phim',
                data: { affected_movies: movieCount }
            });
        }

        const genre = await Genre.findByIdAndDelete(id);
        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json(createResponse(
            null,
            'Đã xóa thể loại thành công'
        ));
    } catch (error) {
        console.error('Delete genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi xóa thể loại',
            error: error.message
        });
    }
};

module.exports = {
    getGenres,
    getGenreMovies,
    createGenre,
    updateGenre,
    updateStatus,
    deleteGenre
};

