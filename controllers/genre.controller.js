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

// Lấy danh sách thể loại
exports.getAllGenres = async (req, res) => {
    try {
        const genres = await Genre.find().sort({ genre_name: 1 });

        res.json({
            status: 'success',
            data: {
                genres,
                total: genres.length
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

// Lấy chi tiết một thể loại
exports.getGenreById = async (req, res) => {
    try {
        const { id } = req.params;
        const genre = await Genre.findById(id);

        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        res.json({
            status: 'success',
            data: { genre }
        });

    } catch (error) {
        console.error('Get genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy thông tin thể loại',
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

        // Kiểm tra các thể loại có tồn tại
        const genres = await Genre.find({ _id: { $in: genreIdArray } });
        if (genres.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại nào'
            });
        }

        // Tìm phim có tất cả các thể loại được chọn
        const query = {
            genres: {
                $all: genreIdArray // Sử dụng $all để tìm phim có tất cả thể loại
            }
        };

        // Thực hiện truy vấn lấy tất cả phim
        const movies = await Movie.find(query)
            .populate('genres', 'genre_name description')
            .select('movie_title description production_time producer movie_type price is_free price_display')
            .sort({ production_time: -1 });

        // Format response
        const response = {
            status: 'success',
            data: {
                genres: genres.map(genre => ({
                    _id: genre._id,
                    genre_name: genre.genre_name,
                    description: genre.description
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
                    genres: movie.genres
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

// Lấy danh sách phim theo một thể loại
exports.getMoviesByGenre = async (req, res) => {
    try {
        const { genre_id } = req.params;

        // Kiểm tra thể loại tồn tại
        const genre = await Genre.findById(genre_id);
        if (!genre) {
            return res.status(404).json({
                status: 'error',
                message: 'Không tìm thấy thể loại'
            });
        }

        // Tìm tất cả phim có thể loại này
        const movies = await Movie.find({ genres: genre_id })
            .populate('genres', 'genre_name description')
            .select('movie_title description production_time producer movie_type price is_free price_display')
            .sort({ production_time: -1 });

        res.json({
            status: 'success',
            data: {
                genre: {
                    _id: genre._id,
                    genre_name: genre.genre_name,
                    description: genre.description
                },
                movies,
                total_movies: movies.length
            }
        });

    } catch (error) {
        console.error('Get movies by genre error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Lỗi khi lấy danh sách phim theo thể loại',
            error: error.message
        });
    }
}; 