/**
 * Áp dụng các methods cho Watching model
 * @param {mongoose.Schema} watchingSchema
 */
const applyWatchingMethods = (watchingSchema) => {
    // Instance methods
    watchingSchema.methods.updateProgress = async function(currentTime) {
        this.current_time = currentTime;
        if (currentTime > this.current_time) {
            this.watch_count += 1;
        }
        
        // Tính completed dựa trên watch_percentage >= 95%
        this.completed = this.duration > 0 && 
            (currentTime / this.duration) >= 0.95;
        
        this.last_watched = new Date();
        await this.save();
        
        if (this.completed) {
            await this.constructor.updateMovieViewCount(this.episode_id);
        }
    };

    // Method to handle completion for both single movies and episodes
    watchingSchema.methods.markCompleteIfEligible = async function() {
        // Only mark as completed if watch progress >= 95%
        const watchPercentage = this.duration > 0 ? (this.current_time / this.duration) : 0;
        
        if (watchPercentage >= 0.95) {
            this.completed = true;
            this.last_watched = new Date();
            await this.save();
            
            // Update movie view count when marked as completed
            await this.constructor.updateMovieViewCount(this.episode_id);
            return true;
        }
        
        return false;
    };

    // Static methods
    watchingSchema.statics.updateMovieViewCount = async function(episodeId) {
        const episode = await this.model('Episode').findById(episodeId);
        if (!episode) return;

        const completedViews = await this.countDocuments({
            episode_id: { $in: await this.model('Episode')
                .find({ movie_id: episode.movie_id })
                .select('_id') 
            },
            completed: true
        });

        await this.model('Movie').findByIdAndUpdate(episode.movie_id, {
            view_count: completedViews
        });
    };

    watchingSchema.statics.findOrCreateWatching = async function(userId, episodeId) {
        let watching = await this.findOne({
            user_id: userId,
            episode_id: episodeId
        });

        if (!watching) {
            const episode = await this.model('Episode').findById(episodeId);
            if (!episode) {
                throw new Error('Episode not found');
            }

            watching = new this({
                user_id: userId,
                episode_id: episodeId,
                duration: episode.duration
            });
        }

        return watching;
    };

    // Method to complete a movie/episode with proper validation
    watchingSchema.statics.completeWatching = async function(userId, episodeId, currentTime = null) {
        const watching = await this.findOrCreateWatching(userId, episodeId);
        
        // If currentTime is provided, update progress first
        if (currentTime !== null) {
            await watching.updateProgress(currentTime);
        } else {
            // Check if eligible for completion based on current progress
            await watching.markCompleteIfEligible();
        }
        
        return watching;
    };

    // Query helpers
    watchingSchema.query.byUser = function(userId) {
        return this.where({ user_id: userId });
    };

    watchingSchema.query.notCompleted = function() {
        return this.where({ completed: false });
    };

    watchingSchema.query.recentlyWatched = function(limit = 10) {
        return this.sort({ last_watched: -1 }).limit(limit);
    };

    // Virtuals
    watchingSchema.virtual('remainingTime').get(function() {
        return Math.max(0, this.duration - this.current_time);
    });

    // Add watch_percentage virtual property
    watchingSchema.virtual('watch_percentage').get(function() {
        if (this.duration <= 0) return 0;
        return Math.min(100, (this.current_time / this.duration) * 100);
    });

    // Middleware
    watchingSchema.pre('save', async function(next) {
        if (this.isModified('current_time') || this.isModified('duration')) {
            // Tính completed dựa trên watch_percentage >= 95%
            this.completed = this.duration > 0 && 
                (this.current_time / this.duration) >= 0.95;
        }
        this.last_watched = new Date();
        next();
    });
};

module.exports = applyWatchingMethods; 