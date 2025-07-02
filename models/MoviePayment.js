const mongoose = require('mongoose');

const moviePaymentSchema = new mongoose.Schema({
    orderCode: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'CANCELLED', 'FAILED'],
        default: 'PENDING'
    },
    rentalType: {
        type: String,
        enum: ['48h', '30d'],
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['BANK_TRANSFER', 'CREDIT_CARD', 'MOMO', 'ZALOPAY', 'VNPAY', 'OTHER'],
    },
    paymentTime: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    payosData: {
        bin: String,
        checkoutUrl: String,
        accountNumber: String,
        accountName: String,
        qrCode: String,
        description: String,
        cancelReason: String
    },
    rental_48h_start_time: {
        type: Date
    },
    rental_48h_expiration_time: {
        type: Date
    },
    rental_30d_start_time: {
        type: Date
    },
    rental_30d_expiration_time: {
        type: Date
    }
}, {
    timestamps: true
});

// Virtual fields for rental status
moviePaymentSchema.virtual('is_48h_rental_active').get(function() {
    if (!this.rental_48h_start_time || !this.rental_48h_expiration_time) {
        return false;
    }
    return new Date() >= this.rental_48h_start_time && new Date() <= this.rental_48h_expiration_time;
});

moviePaymentSchema.virtual('is_30d_rental_active').get(function() {
    if (!this.rental_30d_start_time || !this.rental_30d_expiration_time) {
        return false;
    }
    return new Date() >= this.rental_30d_start_time && new Date() <= this.rental_30d_expiration_time;
});

// Methods
moviePaymentSchema.methods.start48hRental = function() {
    if (this.status !== 'SUCCESS') {
        throw new Error('Cannot start rental for unpaid order');
    }
    this.rental_48h_start_time = new Date();
    this.rental_48h_expiration_time = new Date(this.rental_48h_start_time.getTime() + (48 * 60 * 60 * 1000));
};

moviePaymentSchema.methods.start30dRental = function() {
    if (this.status !== 'SUCCESS') {
        throw new Error('Cannot start rental for unpaid order');
    }
    this.rental_30d_start_time = new Date();
    this.rental_30d_expiration_time = new Date(this.rental_30d_start_time.getTime() + (30 * 24 * 60 * 60 * 1000));
};

// Pre-save middleware
moviePaymentSchema.pre('save', function(next) {
    // Nếu payment thành công và chưa có thời gian thanh toán
    if (this.status === 'SUCCESS' && !this.paymentTime) {
        this.paymentTime = new Date();
    }
    next();
});

// Indexes
moviePaymentSchema.index({ userId: 1 });
moviePaymentSchema.index({ movieId: 1 });
moviePaymentSchema.index({ status: 1 });
moviePaymentSchema.index({ orderCode: 1 }, { unique: true });

// Static methods
moviePaymentSchema.statics.getRevenueStats = async function(startDate, endDate) {
    const stats = await this.aggregate([
        {
            $match: {
                status: 'SUCCESS',
                paymentTime: { 
                    $gte: new Date(startDate), 
                    $lte: new Date(endDate) 
                }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$paymentTime" } },
                    rentalType: '$rentalType'
                },
                totalRevenue: { $sum: '$amount' },
                totalRentals: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.date': 1 }
        }
    ]);

    return stats;
};

module.exports = mongoose.model('MoviePayment', moviePaymentSchema); 