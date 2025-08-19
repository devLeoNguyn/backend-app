const cron = require('node-cron');
const MovieRental = require('../models/MovieRental');
const Notification = require('../models/Notification');
const notificationService = require('./notification.service');
const pushNotificationService = require('./push-notification.service');

class CronService {
    
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
    }

    /**
     * Khởi tạo tất cả cron jobs
     */
    init() {
        if (this.isInitialized) {
            console.log('Cron jobs already initialized');
            return;
        }

        try {
            // Job 1: Kiểm tra và expire rentals hết hạn - chạy mỗi giờ
            this.scheduleExpiredRentalsCheck();
            
            // Job 2: Gửi thông báo sắp hết hạn - chạy mỗi 30 phút
            this.scheduleExpiringNotifications();
            
            // Job 3: Cleanup old rentals - chạy hàng ngày lúc 2:00 AM
            this.scheduleCleanupOldRentals();
            
            // Job 4: Generate daily stats - chạy hàng ngày lúc 1:00 AM
            this.scheduleDailyStatsGeneration();

            // New job: Check and send scheduled notifications - chạy mỗi phút
            this.scheduleNotificationSender();
            
            // New job: Clean up old notifications - chạy hàng tuần
            this.scheduleNotificationCleanup();

            this.isInitialized = true;
            console.log('All cron jobs initialized successfully');

        } catch (error) {
            console.error('Error initializing cron jobs:', error);
        }
    }

    /**
     * Job 1: Kiểm tra và expire rentals hết hạn
     * Chạy mỗi giờ lúc phút thứ 0
     */
    scheduleExpiredRentalsCheck() {
        const job = cron.schedule('0 * * * *', async () => {
            try {
                console.log('Running expired rentals check...');
                
                const expiredRentals = await MovieRental.findExpiredRentals();
                let expiredCount = 0;

                for (const rental of expiredRentals) {
                    try {
                        await rental.expire();
                        expiredCount++;
                        
                        console.log(`Expired rental: User ${rental.userId.name || rental.userId.email} - Movie ${rental.movieId.movie_title}`);
                    } catch (error) {
                        console.error(`Error expiring rental ${rental._id}:`, error);
                    }
                }

                console.log(`Expired rentals check completed. ${expiredCount} rentals expired.`);

            } catch (error) {
                console.error('Error in expired rentals check job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('expiredRentalsCheck', job);
        job.start();
        console.log('Scheduled expired rentals check job (every hour)');
    }

    /**
     * Job 2: Gửi thông báo cho rentals sắp hết hạn
     * Chạy mỗi 30 phút
     */
    scheduleExpiringNotifications() {
        const job = cron.schedule('*/30 * * * *', async () => {
            try {
                console.log('Checking for expiring rentals...');
                
                const expiringRentals = await MovieRental.findExpiringSoon();
                let notificationCount = 0;

                for (const rental of expiringRentals) {
                    try {
                        const remainingHours = Math.ceil(rental.remainingTime / (1000 * 60 * 60));
                        console.log(`Rental expiring soon: User ${rental.userId.name || rental.userId.email} - Movie ${rental.movieId.movie_title} - ${remainingHours}h remaining`);
                        
                        // Mark notification as sent
                        await rental.markNotificationSent();
                        notificationCount++;

                        // Send push notification using push notification service
                        await pushNotificationService.sendRentalExpiryNotification(
                            rental.userId._id,
                            rental.movieId._id,
                            rental.movieId.movie_title,
                            remainingHours
                        );

                    } catch (error) {
                        console.error(`Error processing expiring rental ${rental._id}:`, error);
                    }
                }

                console.log(`Expiring notifications check completed. ${notificationCount} notifications processed.`);

            } catch (error) {
                console.error('Error in expiring notifications job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('expiringNotifications', job);
        job.start();
        console.log('Scheduled expiring notifications job (every 30 minutes)');
    }

    /**
     * Job 3: Cleanup old expired rentals
     * Chạy hàng ngày lúc 2:00 AM
     */
    scheduleCleanupOldRentals() {
        const job = cron.schedule('0 2 * * *', async () => {
            try {
                console.log('Running cleanup of old rentals...');
                
                // Xóa các rental đã expired hơn 90 ngày
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                const result = await MovieRental.deleteMany({
                    status: 'expired',
                    endTime: { $lt: ninetyDaysAgo }
                });

                console.log(`Cleanup completed. Deleted ${result.deletedCount} old expired rentals.`);

            } catch (error) {
                console.error('Error in cleanup old rentals job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('cleanupOldRentals', job);
        job.start();
        console.log('Scheduled cleanup old rentals job (daily at 2:00 AM)');
    }

    /**
     * Job 4: Generate daily statistics
     * Chạy hàng ngày lúc 1:00 AM
     */
    scheduleDailyStatsGeneration() {
        const job = cron.schedule('0 1 * * *', async () => {
            try {
                console.log('Generating daily rental statistics...');
                
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Thống kê rentals trong ngày
                const dailyRentals = await MovieRental.find({
                    createdAt: { $gte: yesterday, $lt: today }
                }).populate('paymentId', 'amount');

                const stats = {
                    date: yesterday.toISOString().split('T')[0],
                    totalRentals: dailyRentals.length,
                    rentals48h: dailyRentals.filter(r => r.rentalType === '48h').length,
                    rentals30d: dailyRentals.filter(r => r.rentalType === '30d').length,
                    totalRevenue: dailyRentals.reduce((sum, r) => sum + (r.paymentId?.amount || 0), 0)
                };

                console.log('Daily stats:', stats);

                // TODO: Save stats to database or send to analytics service
                
            } catch (error) {
                console.error('Error in daily stats generation job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('dailyStatsGeneration', job);
        job.start();
        console.log('Scheduled daily stats generation job (daily at 1:00 AM)');
    }

    /**
     * New Job: Check and send scheduled notifications
     * Chạy mỗi phút
     */
    scheduleNotificationSender() {
        const job = cron.schedule('* * * * *', async () => {
            try {
                console.log('Checking for scheduled notifications...');
                
                // Find all scheduled notifications that are due
                const scheduledNotifications = await Notification.findScheduledNotifications();
                
                if (scheduledNotifications.length === 0) {
                    return console.log('No scheduled notifications due');
                }
                
                console.log(`Found ${scheduledNotifications.length} scheduled notifications to send`);
                
                // Send each notification
                for (const notification of scheduledNotifications) {
                    try {
                        console.log(`Sending scheduled notification: ${notification._id} - "${notification.title}"`);
                        await notificationService.sendNotification(notification._id);
                    } catch (error) {
                        console.error(`Error sending scheduled notification ${notification._id}:`, error);
                    }
                }
                
                console.log('Scheduled notification sending completed');
            } catch (error) {
                console.error('Error in notification sender job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('notificationSender', job);
        job.start();
        console.log('Scheduled notification sender job (every minute)');
    }

    /**
     * New Job: Clean up old notifications
     * Chạy hàng tuần vào Chủ Nhật lúc 3:00 AM
     */
    scheduleNotificationCleanup() {
        const job = cron.schedule('0 3 * * 0', async () => {
            try {
                console.log('Running notification cleanup...');
                
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                
                // Clean up old notifications (older than 90 days and already sent or failed)
                const notificationResult = await Notification.deleteMany({
                    status: { $in: ['sent', 'failed'] },
                    created_at: { $lt: ninetyDaysAgo }
                });
                
                // Delete related user notifications
                const userNotificationResult = await mongoose.model('UserNotification').deleteMany({
                    notification_id: { $exists: false }  // Delete orphaned records
                });
                
                console.log(`Notification cleanup completed. Deleted ${notificationResult.deletedCount} old notifications and ${userNotificationResult.deletedCount} orphaned user notifications.`);
                
            } catch (error) {
                console.error('Error in notification cleanup job:', error);
            }
        }, {
            scheduled: false,
            timezone: "Asia/Ho_Chi_Minh"
        });

        this.jobs.set('notificationCleanup', job);
        job.start();
        console.log('Scheduled notification cleanup job (weekly on Sunday at 3:00 AM)');
    }

    /**
     * Gửi thông báo sắp hết hạn (placeholder)
     */
    async sendExpiringNotification(rental) {
        try {
            const remainingHours = Math.ceil(rental.remainingTime / (1000 * 60 * 60));
                            const message = `Phim "${rental.movieId.movie_title}" của bạn sắp hết hạn trong ${remainingHours} giờ nữa.`;
            
            // Use push notification service to send expiry notification
            await pushNotificationService.sendRentalExpiryNotification(
                rental.userId._id,
                rental.movieId._id,
                rental.movieId.movie_title,
                remainingHours
            );
            
            console.log(`Sent notification to ${rental.userId.email}: ${message}`);
            return true;
        } catch (error) {
            console.error(`Error sending expiring notification for rental ${rental._id}:`, error);
            return false;
        }
    }

    /**
     * Dừng một job cụ thể
     */
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            console.log(`Stopped job: ${jobName}`);
            return true;
        }
        return false;
    }

    /**
     * Khởi động lại một job cụ thể
     */
    startJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.start();
            console.log(`Started job: ${jobName}`);
            return true;
        }
        return false;
    }

    /**
     * Dừng tất cả jobs
     */
    stopAllJobs() {
        for (const [name, job] of this.jobs) {
            job.stop();
            console.log(`Stopped job: ${name}`);
        }
    }

    /**
     * Khởi động lại tất cả jobs
     */
    startAllJobs() {
        for (const [name, job] of this.jobs) {
            job.start();
            console.log(`Started job: ${name}`);
        }
    }

    /**
     * Lấy trạng thái của tất cả jobs
     */
    getJobsStatus() {
        const status = {};
        for (const [name, job] of this.jobs) {
            status[name] = {
                running: job.running || false,
                scheduled: job.scheduled || false
            };
        }
        return status;
    }

    /**
     * Chạy manual check (for testing)
     */
    async runManualCheck() {
        try {
            console.log('Running manual rental checks...');
            
            // Check expired rentals
            const expiredRentals = await MovieRental.findExpiredRentals();
            for (const rental of expiredRentals) {
                await rental.expire();
            }
            
            // Check expiring rentals
            const expiringRentals = await MovieRental.findExpiringSoon();
            for (const rental of expiringRentals) {
                await rental.markNotificationSent();
            }

            return {
                success: true,
                expiredCount: expiredRentals.length,
                expiringCount: expiringRentals.length
            };

        } catch (error) {
            console.error('Error in manual check:', error);
            throw error;
        }
    }

    /**
     * Run manual notification check
     */
    async runManualNotificationCheck() {
        try {
            console.log('Running manual notification check...');
            
            // Find all scheduled notifications that are due
            const scheduledNotifications = await Notification.findScheduledNotifications();
            
            if (scheduledNotifications.length === 0) {
                console.log('No scheduled notifications due');
                return { sent: 0, total: 0 };
            }
            
            console.log(`Found ${scheduledNotifications.length} scheduled notifications to send`);
            
            let sentCount = 0;
            
            // Send each notification
            for (const notification of scheduledNotifications) {
                try {
                    console.log(`Sending scheduled notification: ${notification._id} - "${notification.title}"`);
                    await notificationService.sendNotification(notification._id);
                    sentCount++;
                } catch (error) {
                    console.error(`Error sending scheduled notification ${notification._id}:`, error);
                }
            }
            
            console.log(`Manual notification check completed. Sent ${sentCount} notifications.`);
            return { sent: sentCount, total: scheduledNotifications.length };
            
        } catch (error) {
            console.error('Error in manual notification check:', error);
            throw error;
        }
    }

    /**
     * Run manual expiring notification check (for testing)
     */
    async runManualExpiringNotificationCheck() {
        try {
            console.log('Running manual expiring notification check...');
            
            const expiringRentals = await MovieRental.findExpiringSoon();
            let notificationCount = 0;

            console.log(`Found ${expiringRentals.length} rentals expiring soon`);

            for (const rental of expiringRentals) {
                try {
                    const remainingHours = Math.ceil(rental.remainingTime / (1000 * 60 * 60));
                    console.log(`Processing rental: User ${rental.userId.name || rental.userId.email} - Movie ${rental.movieId.movie_title} - ${remainingHours}h remaining`);
                    
                    // Mark notification as sent
                    await rental.markNotificationSent();
                    notificationCount++;

                    // Send push notification using push notification service
                    const result = await pushNotificationService.sendRentalExpiryNotification(
                        rental.userId._id,
                        rental.movieId._id,
                        rental.movieId.movie_title,
                        remainingHours
                    );

                    console.log(`Notification result for rental ${rental._id}:`, result);

                } catch (error) {
                    console.error(`Error processing expiring rental ${rental._id}:`, error);
                }
            }

            console.log(`Manual expiring notification check completed. ${notificationCount} notifications processed.`);
            return {
                success: true,
                processedCount: notificationCount,
                totalExpiring: expiringRentals.length
            };

        } catch (error) {
            console.error('Error in manual expiring notification check:', error);
            throw error;
        }
    }
}

module.exports = new CronService();