require('dotenv').config();
const mongoose = require('mongoose');
const MovieRental = require('../models/MovieRental');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const User = require('../models/User');
const Movie = require('../models/Movie');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://cdanh:danh123456@cluster0.exgdfsv.mongodb.net/Movie?retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function monitorCronJob() {
  try {
    console.log('🔍 Monitoring Cron Job and Notifications...\n');

    // 1. Check current rental status
    const rental = await MovieRental.findById('68a555f03a1c2caefc790a92')
      .populate('userId', 'name email')
      .populate('movieId', 'movie_title');

    if (!rental) {
      console.log('❌ Rental not found');
      return;
    }

    const now = new Date();
    const remainingTime = rental.endTime.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingTime / (1000 * 60));

    console.log('📋 Current Rental Status:');
    console.log(`- Movie: ${rental.movieId?.movie_title}`);
    console.log(`- User: ${rental.userId?.name || rental.userId?.email}`);
    console.log(`- End Time: ${rental.endTime.toLocaleString()}`);
    console.log(`- Remaining Time: ${remainingMinutes} minutes`);
    console.log(`- Notification Sent: ${rental.notificationSent}`);
    console.log(`- Status: ${rental.status}`);

    // 2. Check if rental is expiring soon
    const expiringRentals = await MovieRental.findExpiringSoon();
    console.log(`\n⏰ Expiring Rentals (within 2 hours): ${expiringRentals.length}`);
    
    if (expiringRentals.length > 0) {
      console.log('📱 Rentals that will trigger notifications:');
      for (const expRental of expiringRentals) {
        const remTime = Math.ceil(expRental.remainingTime / (1000 * 60));
        console.log(`- ${expRental.movieId?.movie_title} (${remTime} minutes remaining)`);
      }
    } else {
      console.log('ℹ️ No rentals expiring soon');
    }

    // 3. Check recent notifications
    const recentNotifications = await Notification.find({
      event_type: 'rental_expiry',
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ created_at: -1 }).limit(5);

    console.log(`\n📨 Recent Rental Expiry Notifications (last 24h): ${recentNotifications.length}`);
    
    if (recentNotifications.length > 0) {
      console.log('📋 Recent notifications:');
      for (const notif of recentNotifications) {
        console.log(`- ${notif.title} (${notif.created_at.toLocaleString()})`);
        console.log(`  Status: ${notif.status}, Sent: ${notif.sent_count}`);
      }
    } else {
      console.log('ℹ️ No recent rental expiry notifications');
    }

    // 4. Check recent user notifications
    const recentUserNotifications = await UserNotification.find({
      created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).populate('notification_id').sort({ created_at: -1 }).limit(5);

    console.log(`\n👤 Recent User Notifications (last 24h): ${recentUserNotifications.length}`);
    
    if (recentUserNotifications.length > 0) {
      console.log('📋 Recent user notifications:');
      for (const userNotif of recentUserNotifications) {
        const notif = userNotif.notification_id;
        if (notif && notif.event_type === 'rental_expiry') {
          console.log(`- ${notif.title} (${userNotif.created_at.toLocaleString()})`);
          console.log(`  Sent: ${userNotif.is_sent}, Read: ${userNotif.is_read}`);
        }
      }
    } else {
      console.log('ℹ️ No recent user notifications');
    }

    // 5. Cron job schedule info
    console.log('\n⏰ Cron Job Information:');
    console.log('- Expiring notifications check: Every 30 minutes (*/30 * * * *)');
    console.log('- Timezone: Asia/Ho_Chi_Minh');
    console.log('- Next run: Within 30 minutes from now');
    
    const nextCronTime = new Date();
    nextCronTime.setMinutes(Math.ceil(nextCronTime.getMinutes() / 30) * 30, 0, 0);
    console.log(`- Estimated next run: ${nextCronTime.toLocaleString()}`);

    // 6. What to expect
    console.log('\n🔮 What to Expect:');
    if (remainingMinutes <= 120 && !rental.notificationSent) {
      console.log('✅ This rental will trigger notification when cron job runs');
      console.log(`⏳ Waiting for cron job (within 30 minutes)`);
      console.log('📱 Push notification will be sent to user');
    } else if (rental.notificationSent) {
      console.log('ℹ️ Notification already sent for this rental');
    } else {
      console.log('⏳ Rental not expiring soon enough to trigger notification');
    }

    console.log('\n📊 Monitoring Commands:');
    console.log('1. Check server logs for: "Checking for expiring rentals..."');
    console.log('2. Check server logs for: "Rental expiry notification sent successfully"');
    console.log('3. Monitor this script: node scripts/monitor-cron-job.js');
    console.log('4. Check notifications in database');

  } catch (error) {
    console.error('❌ Error monitoring cron job:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  monitorCronJob();
}

module.exports = monitorCronJob;
