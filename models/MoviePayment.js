const mongoose = require('mongoose');

const moviePaymentSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movie_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    payment_date: {
        type: Date,
        default: Date.now
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
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    payment_method: {
        type: String,
        enum: ['credit_card', 'momo', 'zalopay', 'bank_transfer'],
        required: true
    }
}, {
    timestamps: true
});

// Tạo index cho việc tìm kiếm giao dịch
moviePaymentSchema.index({ user_id: 1, movie_id: 1, payment_date: -1 });

// Tạo index cho việc kiểm tra thời hạn thuê
moviePaymentSchema.index({ rental_48h_expiration_time: 1 });
moviePaymentSchema.index({ rental_30d_expiration_time: 1 });

// Virtual field để kiểm tra trạng thái thuê
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
    this.rental_48h_start_time = new Date();
    this.rental_48h_expiration_time = new Date(this.rental_48h_start_time.getTime() + (48 * 60 * 60 * 1000));
};

moviePaymentSchema.methods.start30dRental = function() {
    this.rental_30d_start_time = new Date();
    this.rental_30d_expiration_time = new Date(this.rental_30d_start_time.getTime() + (30 * 24 * 60 * 60 * 1000));
};

module.exports = mongoose.model('MoviePayment', moviePaymentSchema); 