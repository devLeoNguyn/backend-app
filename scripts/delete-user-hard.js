const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = 'mongodb+srv://cdanh:danh123456@cluster0.exgdfsv.mongodb.net/Movie?retryWrites=true&w=majority';

// User ID to delete
const USER_ID_TO_DELETE = '68ad68695633840c487a1000';

// Import models
const User = require('../models/User');
const Rating = require('../models/Rating');
const Favorite = require('../models/Favorite');
const Watching = require('../models/Watching');
const MovieRental = require('../models/MovieRental');
const MoviePayment = require('../models/MoviePayment');
const UserNotification = require('../models/UserNotification');
const Notification = require('../models/Notification');
const OTP = require('../models/OTP');

async function deleteUserAndRelatedData() {
    let connection;
    
    try {
        console.log('🔗 Connecting to MongoDB...');
        connection = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB successfully');

        console.log(`\n🗑️  Starting hard delete for user ID: ${USER_ID_TO_DELETE}`);
        console.log('=' .repeat(60));

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(USER_ID_TO_DELETE)) {
            throw new Error('Invalid user ID format');
        }

        // Check if user exists first
        const userExists = await User.findById(USER_ID_TO_DELETE);
        if (!userExists) {
            console.log('⚠️  User not found in database');
            return;
        }

        console.log(`👤 Found user: ${userExists.full_name} (${userExists.email})`);

        // Start transaction for data consistency
        const session = await mongoose.startSession();
        
        try {
            await session.withTransaction(async () => {
                let totalDeleted = 0;

                // 1. Delete OTP records
                console.log('\n📱 Deleting OTP records...');
                const otpResult = await OTP.deleteMany({ user_id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${otpResult.deletedCount} OTP records`);

                // 2. Delete UserNotification records
                console.log('\n🔔 Deleting UserNotification records...');
                const userNotificationResult = await UserNotification.deleteMany({ user_id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${userNotificationResult.deletedCount} UserNotification records`);

                // 3. Delete Watching history
                console.log('\n📺 Deleting Watching history...');
                const watchingResult = await Watching.deleteMany({ user_id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${watchingResult.deletedCount} Watching records`);

                // 4. Delete Favorite records
                console.log('\n❤️  Deleting Favorite records...');
                const favoriteResult = await Favorite.deleteMany({ user_id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${favoriteResult.deletedCount} Favorite records`);

                // 5. Delete Rating records
                console.log('\n⭐ Deleting Rating records...');
                const ratingResult = await Rating.deleteMany({ user_id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${ratingResult.deletedCount} Rating records`);

                // 6. Delete MovieRental records
                console.log('\n🎬 Deleting MovieRental records...');
                const movieRentalResult = await MovieRental.deleteMany({ userId: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${movieRentalResult.deletedCount} MovieRental records`);

                // 7. Delete MoviePayment records
                console.log('\n💳 Deleting MoviePayment records...');
                const moviePaymentResult = await MoviePayment.deleteMany({ userId: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${moviePaymentResult.deletedCount} MoviePayment records`);

                // 8. Delete Notifications created by this user
                console.log('\n📢 Deleting Notifications created by user...');
                const notificationResult = await Notification.deleteMany({ created_by: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${notificationResult.deletedCount} Notification records`);

                // 9. Finally, delete the User record
                console.log('\n👤 Deleting User record...');
                const userResult = await User.deleteOne({ _id: USER_ID_TO_DELETE }).session(session);
                console.log(`   ✅ Deleted ${userResult.deletedCount} User record`);

                // Calculate total deleted records
                totalDeleted = otpResult.deletedCount + 
                             userNotificationResult.deletedCount + 
                             watchingResult.deletedCount + 
                             favoriteResult.deletedCount + 
                             ratingResult.deletedCount + 
                             movieRentalResult.deletedCount + 
                             moviePaymentResult.deletedCount + 
                             notificationResult.deletedCount + 
                             userResult.deletedCount;

                console.log('\n' + '=' .repeat(60));
                console.log(`🎉 SUCCESS: Hard delete completed!`);
                console.log(`📊 Total records deleted: ${totalDeleted}`);
                console.log(`👤 User ID ${USER_ID_TO_DELETE} and all related data have been permanently removed`);
                console.log('=' .repeat(60));

            });
        } finally {
            await session.endSession();
        }

    } catch (error) {
        console.error('\n❌ ERROR during deletion process:');
        console.error(error.message);
        
        if (error.name === 'ValidationError') {
            console.error('Validation error details:', error.errors);
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('\n🔌 Disconnected from MongoDB');
        }
    }
}

// Verify before execution
async function verifyUserData() {
    let connection;
    
    try {
        console.log('🔗 Connecting to MongoDB for verification...');
        connection = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`\n🔍 Verifying data for user ID: ${USER_ID_TO_DELETE}`);
        console.log('=' .repeat(50));

        const user = await User.findById(USER_ID_TO_DELETE);
        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log(`👤 User: ${user.full_name} (${user.email})`);
        console.log(`📱 Phone: ${user.phone}`);
        console.log(`👥 Role: ${user.role}`);

        // Count related records
        const otpCount = await OTP.countDocuments({ user_id: USER_ID_TO_DELETE });
        const userNotificationCount = await UserNotification.countDocuments({ user_id: USER_ID_TO_DELETE });
        const watchingCount = await Watching.countDocuments({ user_id: USER_ID_TO_DELETE });
        const favoriteCount = await Favorite.countDocuments({ user_id: USER_ID_TO_DELETE });
        const ratingCount = await Rating.countDocuments({ user_id: USER_ID_TO_DELETE });
        const movieRentalCount = await MovieRental.countDocuments({ userId: USER_ID_TO_DELETE });
        const moviePaymentCount = await MoviePayment.countDocuments({ userId: USER_ID_TO_DELETE });
        const notificationCount = await Notification.countDocuments({ created_by: USER_ID_TO_DELETE });

        console.log('\n📊 Related records count:');
        console.log(`   📱 OTP: ${otpCount}`);
        console.log(`   🔔 UserNotifications: ${userNotificationCount}`);
        console.log(`   📺 Watching: ${watchingCount}`);
        console.log(`   ❤️  Favorites: ${favoriteCount}`);
        console.log(`   ⭐ Ratings: ${ratingCount}`);
        console.log(`   🎬 MovieRentals: ${movieRentalCount}`);
        console.log(`   💳 MoviePayments: ${moviePaymentCount}`);
        console.log(`   📢 Notifications created: ${notificationCount}`);

        const totalRecords = otpCount + userNotificationCount + watchingCount + favoriteCount + 
                           ratingCount + movieRentalCount + moviePaymentCount + notificationCount + 1;

        console.log(`\n📈 Total records to be deleted: ${totalRecords} (including user record)`);

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    } finally {
        if (connection) {
            await mongoose.disconnect();
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--verify') || args.includes('-v')) {
        await verifyUserData();
    } else if (args.includes('--delete') || args.includes('-d')) {
        console.log('⚠️  WARNING: This will permanently delete the user and all related data!');
        console.log('⚠️  This action cannot be undone!');
        console.log(`⚠️  User ID: ${USER_ID_TO_DELETE}`);
        
        // Add a small delay to allow user to cancel
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await deleteUserAndRelatedData();
    } else {
        console.log('Usage:');
        console.log('  node delete-user-hard.js --verify  # Verify user data before deletion');
        console.log('  node delete-user-hard.js --delete  # Execute hard delete');
        console.log('');
        console.log('⚠️  WARNING: Hard delete is irreversible!');
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { deleteUserAndRelatedData, verifyUserData };

