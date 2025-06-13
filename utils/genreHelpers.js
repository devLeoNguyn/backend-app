const Genre = require('../models/Genre');
const Movie = require('../models/Movie');

/**
 * Tạo response chuẩn
 */
const createResponse = (data, message = '') => ({
    status: 'success',
    message,
    data
});

/**
 * Đếm số phim cho một thể loại (có thể bao gồm thể loại con)
 */
const getGenreMovieCount = async (genreId, includeChildren = false) => {
    try {
        let genreIds = [genreId];
        
        if (includeChildren) {
            const childGenres = await Genre.find({ 
                parent_genre: genreId, 
                is_active: true 
            }).select('_id');
            genreIds.push(...childGenres.map(child => child._id));
        }
        
        return await Movie.countDocuments({ genres: { $in: genreIds } });
    } catch (error) {
        console.error('Get genre movie count error:', error);
        return 0;
    }
};

/**
 * Lấy thông tin cơ bản của thể loại
 */
const getGenreBasicInfo = (genre) => ({
    _id: genre._id,
    genre_name: genre.genre_name,
    description: genre.description,
    poster: genre.poster || '',
    sort_order: genre.sort_order,
    is_active: genre.is_active,
    is_parent: genre.is_parent
});

/**
 * Lấy thông tin đầy đủ của thể loại (bao gồm số phim)
 */
const getGenreFullInfo = async (genre, includeChildren = false) => {
    const basicInfo = getGenreBasicInfo(genre);
    const movieCount = await getGenreMovieCount(genre._id, includeChildren);
    
    let childrenCount = 0;
    if (genre.is_parent) {
        childrenCount = await Genre.countDocuments({ 
            parent_genre: genre._id, 
            is_active: true 
        });
    }

    return {
        ...basicInfo,
        movie_count: movieCount,
        has_children: childrenCount > 0,
        children_count: childrenCount
    };
};

/**
 * Lấy danh sách thể loại con
 */
const getChildrenGenres = async (parentId) => {
    try {
        const children = await Genre.find({ 
            parent_genre: parentId, 
            is_active: true 
        })
        .select('genre_name description sort_order poster')
        .sort({ sort_order: 1, genre_name: 1 });

        return await Promise.all(
            children.map(async child => await getGenreFullInfo(child, false))
        );
    } catch (error) {
        console.error('Get children genres error:', error);
        return [];
    }
};

/**
 * Cập nhật trạng thái thể loại
 */
const updateGenreStatus = async (genreId, action) => {
    let is_active;
    switch (action) {
        case 'activate':
            is_active = true;
            break;
        case 'deactivate':
            is_active = false;
            break;
        case 'toggle':
            const genre = await Genre.findById(genreId);
            is_active = !genre.is_active;
            break;
        default:
            throw new Error('Invalid action');
    }

    const updatedGenre = await Genre.findByIdAndUpdate(
        genreId,
        { is_active },
        { new: true, runValidators: true }
    );

    const movieCount = await getGenreMovieCount(genreId, true);

    return {
        genre: updatedGenre,
        affected_movies: movieCount,
        note: !is_active && movieCount > 0 
            ? `${movieCount} phim sử dụng thể loại này sẽ không hiển thị trong danh sách thể loại` 
            : null
    };
};

module.exports = {
    createResponse,
    getGenreMovieCount,
    getGenreBasicInfo,
    getGenreFullInfo,
    getChildrenGenres,
    updateGenreStatus
}; 