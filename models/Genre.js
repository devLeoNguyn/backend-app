const mongoose = require('mongoose');

const genreSchema = new mongoose.Schema({
    genre_name: {
        type: String,
        required: true,
        unique: true,
        trim: true
        // Bỏ lowercase vì giờ cần giữ nguyên dấu tiếng Việt
    },
    description: {
        type: String,
        trim: true
    },
    poster: {
        type: String,
        trim: true,
        default: ''
    },
    // Thêm support cho thể loại cha-con
    parent_genre: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Genre',
        default: null,
        index: true
    },
    is_parent: {
        type: Boolean,
        default: true, // Mặc định là thể loại cha
        index: true
    },
    sort_order: {
        type: Number,
        default: 0,
        index: true
    },
    is_active: {
        type: Boolean,
        default: true,
        index: true // Thêm index để query nhanh hơn
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual populate để lấy danh sách phim thuộc thể loại này
genreSchema.virtual('movies', {
    ref: 'Movie',
    localField: '_id',
    foreignField: 'genres'
});

// Virtual để lấy thể loại con
genreSchema.virtual('children', {
    ref: 'Genre',
    localField: '_id',
    foreignField: 'parent_genre'
});

// Virtual để lấy thể loại cha
genreSchema.virtual('parent', {
    ref: 'Genre',
    localField: 'parent_genre',
    foreignField: '_id',
    justOne: true
});

// Index compound cho performance
genreSchema.index({ parent_genre: 1, is_active: 1, sort_order: 1 });
genreSchema.index({ is_parent: 1, is_active: 1, sort_order: 1 });

// Pre-save middleware để tự động set is_parent
genreSchema.pre('save', function(next) {
    // Nếu có parent_genre thì không phải là parent
    if (this.parent_genre) {
        this.is_parent = false;
    }
    next();
});

// Static method để lấy hierarchy tree
genreSchema.statics.getGenreTree = async function() {
    const parentGenres = await this.find({ 
        parent_genre: null, 
        is_active: true 
    })
    .populate({
        path: 'children',
        match: { is_active: true },
        options: { sort: { sort_order: 1, genre_name: 1 } }
    })
    .sort({ sort_order: 1, genre_name: 1 });
    
    return parentGenres;
};

// Instance method để check có children không
genreSchema.methods.hasChildren = async function() {
    const count = await this.constructor.countDocuments({ 
        parent_genre: this._id, 
        is_active: true 
    });
    return count > 0;
};

module.exports = mongoose.model('Genre', genreSchema);