require('dotenv').config();
const mongoose = require('mongoose');
const MovieRental = require('../models/MovieRental');
const User = require('../models/User');
const Movie = require('../models/Movie');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://cdanh:danh123456@cluster0.exgdfsv.mongodb.net/Movie?retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function setupRealTestScenario() {
  try {
    console.log('🎬 Setting up Real Test Scenario...\n');

    // 1. Find the rental and user
    const rental = await MovieRental.findById('68a416d9e37c9f5dafa35dfc')
      .populate('userId', 'name email fcmToken pushNotificationsEnabled notificationMute')
      .populate('movieId', 'movie_title');

    if (!rental) {
      console.log('❌ Rental not found');
      return;
    }

    console.log('📋 Current Status:');
    console.log(`- Rental: ${rental.movieId?.movie_title}`);
    console.log(`- User: ${rental.userId?.name || rental.userId?.email}`);
    console.log(`- Current End Time: ${rental.endTime.toLocaleString()}`);
    console.log(`- Notification Sent: ${rental.notificationSent}`);

    // 2. Check user notification settings (read-only)
    const user = rental.userId;
    console.log(`\n👤 User Notification Settings (from app):`);
    console.log(`- FCM Token: ${user.fcmToken ? 'EXISTS' : 'NULL'}`);
    console.log(`- Push Enabled: ${user.pushNotificationsEnabled}`);
    console.log(`- Muted: ${user.notificationMute?.isMuted || false}`);

    // 3. Setup for real test scenario - ONLY change rental time
    console.log('\n🔧 Setting up for real test scenario...');

    // Update rental end time to 2 hours 2 minutes from now
    const now = new Date();
    const newEndTime = new Date(now.getTime() + (2 * 60 * 60 * 1000) + (2 * 60 * 1000)); // 2 hours + 2 minutes
    
    await MovieRental.findByIdAndUpdate(rental._id, {
      endTime: newEndTime
      // notificationSent will remain as is (false if not sent yet)
    });

    console.log('✅ Setup completed!');
    console.log(`- New end time: ${newEndTime.toLocaleString()}`);
    console.log(`- Time until expiry: 2 hours 2 minutes`);
    console.log(`- Notification sent: ${rental.notificationSent} (unchanged)`);
    console.log(`- User settings: Using app settings (not modified)`);

    // 4. Verify setup
    const updatedRental = await MovieRental.findById(rental._id);
    
    console.log('\n🔍 Verification:');
    console.log(`- Rental end time: ${updatedRental.endTime.toLocaleString()}`);
    console.log(`- Rental notification sent: ${updatedRental.notificationSent}`);

    // 5. Check if rental will be found by findExpiringSoon
    const expiringRentals = await MovieRental.findExpiringSoon();
    console.log(`\n⏰ Expiring rentals found: ${expiringRentals.length}`);
    
    if (expiringRentals.length > 0) {
      const expiringRental = expiringRentals[0];
      const remainingMinutes = Math.ceil(expiringRental.remainingTime / (1000 * 60));
      console.log(`- This rental will trigger notification (${remainingMinutes} minutes remaining)`);
    } else {
      console.log('- This rental will NOT trigger notification yet (more than 2 hours remaining)');
      console.log('- Notification will trigger when time drops below 2 hours');
    }

    // 6. Check notification eligibility (read-only)
    const hasFCMToken = !!user.fcmToken;
    const pushEnabled = !!user.pushNotificationsEnabled;
    const notMuted = !user.notificationMute?.isMuted;
    
    console.log('\n📱 Notification Eligibility (from app settings):');
    console.log(`- Has FCM token: ${hasFCMToken ? '✅ YES' : '❌ NO'}`);
    console.log(`- Push enabled: ${pushEnabled ? '✅ YES' : '❌ NO'}`);
    console.log(`- Not muted: ${notMuted ? '✅ YES' : '❌ NO'}`);
    console.log(`- Can receive notification: ${hasFCMToken && pushEnabled && notMuted ? '✅ YES' : '❌ NO'}`);

    if (hasFCMToken && pushEnabled && notMuted) {
      console.log('\n🎉 Real Test Scenario Ready!');
      console.log('📋 Test Flow:');
      console.log('1. ✅ Rental end time set to 2 hours 2 minutes from now');
      console.log('2. ✅ User notification settings (from app) are ready');
      console.log('3. ⏳ Waiting for time to drop below 2 hours...');
      console.log('4. 🔄 Cron job runs every 30 minutes');
      console.log('5. 📱 When time < 2 hours, cron will find this rental');
      console.log('6. 🔔 Push notification will be sent automatically');
      
      console.log('\n⏰ Timeline:');
      const currentTime = new Date();
      console.log(`- Current time: ${currentTime.toLocaleString()}`);
      console.log(`- Rental expires: ${newEndTime.toLocaleString()}`);
      console.log(`- Notification trigger: When remaining time < 2 hours`);
      console.log(`- Next cron job: Within 30 minutes`);
      
      console.log('\n💡 To test immediately:');
      console.log('1. Run: node scripts/test-current-rental.js');
      console.log('2. Or call API: POST /api/rentals/test-expiry-notification');
      
      console.log('\n🔄 To wait for automatic cron job:');
      console.log('- Cron job runs every 30 minutes');
      console.log('- Check server logs for: "Checking for expiring rentals..."');
      console.log('- Notification will be sent when time drops below 2 hours');
      
    } else {
      console.log('\n❌ Cannot receive notifications. Please check app settings:');
      if (!hasFCMToken) console.log('  - User needs FCM token (check app)');
      if (!pushEnabled) console.log('  - Enable push notifications in app');
      if (!notMuted) console.log('  - Unmute user in app');
    }

  } catch (error) {
    console.error('❌ Error setting up test scenario:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  setupRealTestScenario();
}

module.exports = setupRealTestScenario;
