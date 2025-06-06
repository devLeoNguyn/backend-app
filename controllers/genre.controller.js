const Genre = require('../models/Genre');
const Movie = require('../models/Movie');

// Tạo thể loại mới
exports.createGenre = async (req, res) => {
    try {
        const { genre_name, description } = req.body;
        console.log(req.body);
        // Kiểm tra thể loại đã tồn tại chưa
        const existingGenre = await Genre.findOne({ 
            genre_name: { $regex: new RegExp(`^${genre_name}$`, 'i') }
        });

        if (existingGenre) {
            return res.status(400).json({
                status: 'error',
                message: 'Thể loại này đã tồn tại'
            });
        }

        // Tạo thể loại mới
        const newGenre = new Genre({
            genre_name: genre_name.trim(),
            description: description ? description.trim() : ''
        });

        await newGenre.save();

        res.status(201).json({
            status: 'success',
            message: 'Đã tạo thể loại thành công',
            data: { genre: newGenre }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Thể loại này đã tồn tại'
            });
        }

        console.error('Create genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo thể loại',
            error: error.message
        });
    }
};

// Lấy danh sách thể loại cho admin
exports.getAllGenres = async (req, res) => {
    try {
        // Thêm query parameter để filter theo status
        const { include_inactive } = req.query;
        
        // Mặc định chỉ lấy thể loại active, admin có thể xem tất cả
        let query = {};
        if (include_inactive !== 'true') {
            query.is_active = true;
        }

        const genres = await Genre.find(query).sort({ genre_name: 1 });

        res.json({
            status: 'success',
            data: {
                genres,
                total: genres.length,
                active_count: await Genre.countDocuments({ is_active: true }),
                inactive_count: await Genre.countDocuments({ is_active: false })
            }
        });

    } catch (error) {
        console.error('Get all genres error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại',
            error: error.message
        });
    }
};

// Lấy danh sách thể loại đang hoạt động (cho user)
exports.getActiveGenres = async (req, res) => {
    try {
        const activeGenres = await Genre.find({ is_active: true })
            .select('genre_name description')
            .sort({ genre_name: 1 });

        res.json({
            status: 'success',
            data: {
                genres: activeGenres,
                total: activeGenres.length
            }
        });

    } catch (error) {
        console.error('Get active genres error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại hoạt động',
            error: error.message
        });
    }
};

// Cập nhật thể loại
exports.updateGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { genre_name, description } = req.body;

        const genre = await Genre.findByIdAndUpdate(
            id,
            { genre_name, description },
            { new: true, runValidators: true }
        );

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã cập nhật thể loại thành công',
            data: { genre }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Tên thể loại đã tồn tại'
            });
        }

        console.error('Update genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật thể loại',
            error: error.message
        });
    }
};

// Xóa thể loại
exports.deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra xem có phim nào đang sử dụng thể loại này không
        const moviesUsingGenre = await Movie.find({ genres: id });
        if (moviesUsingGenre.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Không thể xóa thể loại này vì đang được sử dụng bởi một số phim',
                data: {
                    movies_count: moviesUsingGenre.length,
                    movies: moviesUsingGenre.map(m => ({
                        id: m._id,
                        title: m.movie_title
                    }))
                }
            });
        }

        const genre = await Genre.findByIdAndDelete(id);

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã xóa thể loại thành công'
        });

    } catch (error) {
        console.error('Delete genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi xóa thể loại',
            error: error.message
        });
    }
};

// Lấy danh sách phim theo nhiều thể loại
exports.getMoviesByGenres = async (req, res) => {
    try {
        const { genre_ids } = req.query; // Nhận danh sách genre_ids từ query params

        // Validate genre_ids
        if (!genre_ids) {
            return res.status(400).json({
                status: 'error',
                message: 'Vui lòng cung cấp ít nhất một thể loại'
            });
        }

        // Chuyển đổi string genre_ids thành array
        const genreIdArray = genre_ids.split(',').map(id => id.trim());

        // Kiểm tra các thể loại có tồn tại và đang hoạt động
        const genres = await Genre.find({ 
            _id: { $in: genreIdArray },
            is_active: true // Chỉ lấy thể loại đang hoạt động
        });
        
        if (genres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại hoạt động nào'
            });
        }

        // Lấy ID của các thể loại hoạt động
        const activeGenreIds = genres.map(genre => genre._id);

        // Tìm phim có tất cả các thể loại được chọn (chỉ trong số các thể loại hoạt động)
        const query = {
            genres: {
                $all: activeGenreIds // Sử dụng $all để tìm phim có tất cả thể loại
            }
        };

        // Thực hiện truy vấn lấy tất cả phim
        const movies = await Movie.find(query)
            .populate({
                path: 'genres',
                match: { is_active: true }, // Chỉ populate thể loại hoạt động
                select: 'genre_name description is_active'
            })
            .select('movie_title description production_time producer movie_type price is_free price_display')
            .sort({ production_time: -1 });

        // Format response
        const response = {
            status: 'success',
            data: {
                genres: genres.map(genre => ({
                    _id: genre._id,
                    genre_name: genre.genre_name,
                    description: genre.description,
                    is_active: genre.is_active
                })),
                movies: movies.map(movie => ({
                    _id: movie._id,
                    movie_title: movie.movie_title,
                    description: movie.description,
                    production_time: movie.production_time,
                    producer: movie.producer,
                    movie_type: movie.movie_type,
                    price: movie.price,
                    is_free: movie.is_free,
                    price_display: movie.price_display,
                    genres: movie.genres.filter(g => g.is_active) // Lọc chỉ thể loại hoạt động
                })),
                total_movies: movies.length
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Lỗi chi tiết:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách phim theo thể loại',
            error: error.message
        });
    }
};


// Bật/tắt trạng thái thể loại
exports.toggleGenreStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        // Validate is_active
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'is_active phải là boolean (true/false)'
            });
        }

        const genre = await Genre.findByIdAndUpdate(
            id,
            { is_active },
            { new: true, runValidators: true }
        );

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        // Đếm số phim sử dụng thể loại này
        const movieCount = await Movie.countDocuments({ genres: id });

        res.json({
            status: 'success',
            message: `Đã ${is_active ? 'kích hoạt' : 'vô hiệu hóa'} thể loại thành công`,
            data: { 
                genre,
                affected_movies: movieCount
            }
        });

    } catch (error) {
        console.error('Toggle genre status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi cập nhật trạng thái thể loại',
            error: error.message
        });
    }
};

// Kích hoạt thể loại
exports.activateGenre = async (req, res) => {
    try {
        const { id } = req.params;

        const genre = await Genre.findByIdAndUpdate(
            id,
            { is_active: true },
            { new: true, runValidators: true }
        );

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã kích hoạt thể loại thành công',
            data: { genre }
        });

    } catch (error) {
        console.error('Activate genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi kích hoạt thể loại',
            error: error.message
        });
    }
};

// Vô hiệu hóa thể loại
exports.deactivateGenre = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra số phim sử dụng thể loại này
        const movieCount = await Movie.countDocuments({ genres: id });

        const genre = await Genre.findByIdAndUpdate(
            id,
            { is_active: false },
            { new: true, runValidators: true }
        );

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            status: 'success',
            message: 'Đã vô hiệu hóa thể loại thành công',
            data: { 
                genre,
                affected_movies: movieCount,
                note: movieCount > 0 ? `${movieCount} phim sử dụng thể loại này sẽ không hiển thị trong danh sách thể loại` : null
            }
        });

    } catch (error) {
        console.error('Deactivate genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi vô hiệu hóa thể loại',
            error: error.message
        });
    }
};

// === NEW HIERARCHICAL GENRE CONTROLLERS ===

// Lấy cây thể loại đầy đủ (parent + children)
exports.getGenreTree = async (req, res) => {
    try {
        const genreTree = await Genre.getGenreTree();
        
        res.json({
            status: 'success',
            data: {
                genres: genreTree,
                total_parents: genreTree.length,
                total_children: genreTree.reduce((sum, parent) => sum + (parent.children?.length || 0), 0)
            }
        });
    } catch (error) {
        console.error('Get genre tree error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy cây thể loại',
            error: error.message
        });
    }
};

// Lấy danh sách thể loại cha (cho HomeScreen)
exports.getParentGenres = async (req, res) => {
    try {
        const parentGenres = await Genre.find({ 
            parent_genre: null, 
            is_active: true 
        })
        .select('genre_name description sort_order')
        .sort({ sort_order: 1, genre_name: 1 });

        // Đếm số phim cho mỗi thể loại cha (bao gồm cả con)
        const genresWithCounts = await Promise.all(
            parentGenres.map(async (genre) => {
                // Lấy tất cả thể loại con
                const childGenres = await Genre.find({ 
                    parent_genre: genre._id, 
                    is_active: true 
                }).select('_id');
                
                const allGenreIds = [genre._id, ...childGenres.map(child => child._id)];
                
                // Đếm phim thuộc thể loại cha hoặc con
                const movieCount = await Movie.countDocuments({ 
                    genres: { $in: allGenreIds } 
                });
                
                return {
                    ...genre.toObject(),
                    movie_count: movieCount,
                    has_children: childGenres.length > 0,
                    children_count: childGenres.length
                };
            })
        );

        res.json({
            status: 'success',
            data: {
                genres: genresWithCounts,
                total: genresWithCounts.length
            }
        });
    } catch (error) {
        console.error('Get parent genres error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại cha',
            error: error.message
        });
    }
};

// Lấy danh sách thể loại con theo parent (cho GenreChildrenScreen)
exports.getChildrenGenres = async (req, res) => {
    try {
        const { parentId } = req.params;

        // Kiểm tra parent genre tồn tại
        const parentGenre = await Genre.findById(parentId);
        if (!parentGenre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại cha'
            });
        }

        // Lấy thể loại con
        const childrenGenres = await Genre.find({ 
            parent_genre: parentId, 
            is_active: true 
        })
        .select('genre_name description sort_order')
        .sort({ sort_order: 1, genre_name: 1 });

        // Đếm số phim cho mỗi thể loại con
        const genresWithCounts = await Promise.all(
            childrenGenres.map(async (genre) => {
                const movieCount = await Movie.countDocuments({ 
                    genres: genre._id 
                });
                
                return {
                    ...genre.toObject(),
                    movie_count: movieCount
                };
            })
        );

        res.json({
            status: 'success',
            data: {
                parent_genre: {
                    _id: parentGenre._id,
                    genre_name: parentGenre.genre_name,
                    description: parentGenre.description
                },
                children_genres: genresWithCounts,
                total_children: genresWithCounts.length
            }
        });
    } catch (error) {
        console.error('Get children genres error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách thể loại con',
            error: error.message
        });
    }
};

// Tạo thể loại con
exports.createChildGenre = async (req, res) => {
    try {
        const { parent_genre_id, genre_name, description, sort_order } = req.body;

        // Kiểm tra parent genre tồn tại
        const parentGenre = await Genre.findById(parent_genre_id);
        if (!parentGenre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại cha'
            });
        }

        // Kiểm tra tên thể loại đã tồn tại chưa
        const existingGenre = await Genre.findOne({ 
            genre_name: { $regex: new RegExp(`^${genre_name}$`, 'i') }
        });

        if (existingGenre) {
            return res.status(400).json({
                status: 'error',
                message: 'Tên thể loại này đã tồn tại'
            });
        }

        // Tạo thể loại con
        const childGenre = new Genre({
            genre_name: genre_name.trim(),
            description: description ? description.trim() : '',
            parent_genre: parent_genre_id,
            is_parent: false,
            sort_order: sort_order || 0
        });

        await childGenre.save();
        await childGenre.populate('parent', 'genre_name description');

        res.status(201).json({
            status: 'success',
            message: 'Đã tạo thể loại con thành công',
            data: { 
                genre: childGenre,
                parent_info: childGenre.parent
            }
        });
    } catch (error) {
        console.error('Create child genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi tạo thể loại con',
            error: error.message
        });
    }
};

// Lấy phim theo thể loại (bao gồm thể loại con)
exports.getMoviesByGenreIncludeChildren = async (req, res) => {
    try {
        const { genreId } = req.params;
        const { page = 1, limit = 10, include_children = 'true' } = req.query;

        // Kiểm tra genre tồn tại
        const genre = await Genre.findById(genreId);
        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        let genreIds = [genreId];

        // Nếu include_children = true và là parent genre, thêm children
        if (include_children === 'true' && genre.is_parent) {
            const childGenres = await Genre.find({ 
                parent_genre: genreId, 
                is_active: true 
            }).select('_id');
            
            genreIds.push(...childGenres.map(child => child._id));
        }

        // Tính pagination
        const skip = (page - 1) * limit;

        // Lấy phim
        const movies = await Movie.find({ 
            genres: { $in: genreIds } 
        })
        .populate({
            path: 'genres',
            match: { is_active: true },
            select: 'genre_name description parent_genre is_parent'
        })
        .select('movie_title description production_time producer movie_type price is_free price_display poster_path')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        // Đếm tổng số phim
        const totalMovies = await Movie.countDocuments({ 
            genres: { $in: genreIds } 
        });

        const totalPages = Math.ceil(totalMovies / limit);

        res.json({
            status: 'success',
            data: {
                genre_info: {
                    _id: genre._id,
                    genre_name: genre.genre_name,
                    description: genre.description,
                    is_parent: genre.is_parent,
                    includes_children: include_children === 'true' && genre.is_parent
                },
                movies,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_movies: totalMovies,
                    limit: parseInt(limit),
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Get movies by genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy phim theo thể loại',
            error: error.message
        });
    }
};

