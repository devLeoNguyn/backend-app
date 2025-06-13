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
 * - include_poster: boolean (default: false)
 * - include_children: boolean (default: false)
 * - format: 'tree' | 'list' (default: 'list')
 */
exports.getGenres = async (req, res) => {
    try {
        const { 
            type = 'all',
            include_poster = 'false',
            include_children = 'false',
            format = 'list'
        } = req.query;

        // Xây dựng query base
        let query = {};
        if (type === 'parent') {
            query.parent_genre = null;
        }
        if (type === 'active') {
            query.is_active = true;
        }

        // Lấy danh sách thể loại
        const genres = await Genre.find(query)
            .select(include_poster === 'true' ? '+poster' : '-poster')
            .sort({ sort_order: 1, genre_name: 1 });

        // Format response theo yêu cầu
        let formattedGenres;
        if (format === 'tree' && type === 'parent') {
            formattedGenres = await Promise.all(
                genres.map(async (genre) => {
                    const genreInfo = await getGenreFullInfo(genre, true);
                    if (include_children === 'true') {
                        genreInfo.children = await getChildrenGenres(genre._id);
                    }
                    return genreInfo;
                })
            );
        } else {
            formattedGenres = await Promise.all(
                genres.map(genre => getGenreFullInfo(genre, false))
            );
        }

        res.json(createResponse({
            genres: formattedGenres,
            total: formattedGenres.length,
            type,
            format
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
 * Lấy thể loại con theo parent
 * GET /api/genres/:parentId/children
 */
exports.getGenreChildren = async (req, res) => {
    try {
        const { parentId } = req.params;

        // Kiểm tra parent genre tồn tại và là thể loại cha đang active
        const parentGenre = await Genre.findOne({
            _id: parentId,
            is_parent: true,
            is_active: true
        });
        
        if (!parentGenre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại cha hoặc thể loại này không phải là thể loại cha'
            });
        }

        const children = await getChildrenGenres(parentId);
        const parentInfo = await getGenreFullInfo(parentGenre, true);

        res.json(createResponse({
            parent_genre: parentInfo,
            children_genres: children,
            total_children: children.length
        }));
    } catch (error) {
        console.error('Get genre children error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại con',
            error: error.message
        });
    }
};

// === ADMIN ROUTES ===

/**
 * Tạo thể loại mới
 * POST /api/genres
 */
exports.createGenre = async (req, res) => {
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
exports.updateGenre = async (req, res) => {
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
exports.updateStatus = async (req, res) => {
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
exports.deleteGenre = async (req, res) => {
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

