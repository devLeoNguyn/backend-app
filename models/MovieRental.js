const mongoose = require('mongoose');

const movieRentalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    movieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true,
        index: true
    },
    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MoviePayment',
        required: true
    },
    rentalType: {
        type: String,
        enum: ['48h', '30d'],
        required: true
    },
    startTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active',
        index: true
    },
    notificationSent: {
        type: Boolean,
        default: false
    },
    accessCount: {
        type: Number,
        default: 0
    },
    lastAccessTime: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound indexes for better performance
movieRentalSchema.index({ userId: 1, movieId: 1 });
movieRentalSchema.index({ status: 1, endTime: 1 });
movieRentalSchema.index({ endTime: 1, notificationSent: 1 });

// Virtual field to check if rental is currently active
movieRentalSchema.virtual('isActive').get(function() {
    const now = new Date();
    return this.status === 'active' && now >= this.startTime && now <= this.endTime;
});

// Virtual field to get remaining time in milliseconds
movieRentalSchema.virtual('remainingTime').get(function() {
    const now = new Date();
    if (this.status !== 'active' || now > this.endTime) {
        return 0;
    }
    return Math.max(0, this.endTime.getTime() - now.getTime());
});

// Virtual field to check if rental is expiring soon (within 2 hours)
movieRentalSchema.virtual('isExpiringSoon').get(function() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    return this.status === 'active' && this.endTime <= twoHoursFromNow && this.endTime > now;
});

// Methods
movieRentalSchema.methods.recordAccess = function() {
    this.accessCount += 1;
    this.lastAccessTime = new Date();
    return this.save();
};

movieRentalSchema.methods.cancel = function() {
    this.status = 'cancelled';
    return this.save();
};

movieRentalSchema.methods.expire = function() {
    this.status = 'expired';
    return this.save();
};

movieRentalSchema.methods.markNotificationSent = function() {
    this.notificationSent = true;
    return this.save();
};

// Static methods
movieRentalSchema.statics.findActiveRental = function(userId, movieId) {
    return this.findOne({
        userId,
        movieId,
        status: 'active',
        startTime: { $lte: new Date() },
        endTime: { $gte: new Date() }
    }).populate('movieId', 'title poster price').populate('paymentId', 'amount orderCode');
};

movieRentalSchema.statics.findExpiredRentals = function() {
    return this.find({
        status: 'active',
        endTime: { $lt: new Date() }
    }).populate('userId', 'name email').populate('movieId', 'title');
};

movieRentalSchema.statics.findExpiringSoon = function() {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    
    return this.find({
        status: 'active',
        endTime: { $gte: now, $lte: twoHoursFromNow },
        notificationSent: false
    }).populate('userId', 'name email').populate('movieId', 'title');
};

movieRentalSchema.statics.getUserRentalHistory = function(userId, options = {}) {
    const { page = 1, limit = 10, status, rentalType } = options;
    const skip = (page - 1) * limit;
    
    const query = { userId };
    if (status) query.status = status;
    if (rentalType) query.rentalType = rentalType;
    
    return this.find(query)
        .populate('movieId', 'movie_title poster_path movie_type producer price total_episodes')
        .populate('paymentId', 'amount orderCode paymentTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

movieRentalSchema.statics.getRevenueStats = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                status: { $in: ['active', 'expired'] },
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $lookup: {
                from: 'moviepayments',
                localField: 'paymentId',
                foreignField: '_id',
                as: 'payment'
            }
        },
        {
            $unwind: '$payment'
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    rentalType: '$rentalType'
                },
                totalRevenue: { $sum: '$payment.amount' },
                totalRentals: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.date': 1 }
        }
    ]);
};

// Pre-save middleware
movieRentalSchema.pre('save', function(next) {
    if (this.isNew && !this.endTime) {
        const duration = this.rentalType === '48h' ? 48 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        this.endTime = new Date(this.startTime.getTime() + duration);
    }
    next();
});

// Add virtual fields to JSON output
movieRentalSchema.set('toJSON', { virtuals: true });
movieRentalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MovieRental', movieRentalSchema); 