/**
 * Áp dụng các methods cho Watching model
 * @param {mongoose.Schema} watchingSchema
 */
const applyWatchingMethods = (watchingSchema) => {
    // Instance methods
    watchingSchema.methods.updateProgress = async function(currentTime, forceCompleted = false) {
        const oldTime = this.current_time || 0;
        this.current_time = currentTime;
        
        // Chỉ tăng watch_count khi thời gian mới lớn hơn thời gian cũ
        if (currentTime > oldTime) {
            this.watch_count = (this.watch_count || 0) + 1;
        }
        
        // Tính watch_percentage
        this.watch_percentage = this.duration > 0 ? 
            Math.min(100, (currentTime / this.duration) * 100) : 0;
        
        // Tính completed dựa trên watch_percentage >= 95% hoặc forceCompleted
        this.completed = forceCompleted || 
            (this.duration > 0 && (currentTime / this.duration) >= 0.95);
        
        this.last_watched = new Date();
        await this.save();
        
        if (this.completed) {
            await this.constructor.updateMovieViewCount(this.episode_id);
        }
    };

    // Method to handle completion for both single movies and episodes
    watchingSchema.methods.markCompleteIfEligible = async function(forceCompleted = false) {
        // Mark as completed if forced or watch progress >= 95%
        const watchPercentage = this.duration > 0 ? (this.current_time / this.duration) : 0;
        
        if (forceCompleted || watchPercentage >= 0.95) {
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

    watchingSchema.statics.findOrCreateWatching = async function(userId, id, duration) {
        let watching = await this.findOne({
            user_id: userId,
            episode_id: id
        });

        if (!watching) {
            let targetEpisode;
            let targetMovie;
            
            // Try to find as Episode first
            targetEpisode = await this.model('Episode').findById(id)
                .populate('movie_id', 'movie_title movie_type'); // Populate movie info
            
            if (targetEpisode) {
                // Validate episode
                if (!targetEpisode.movie_id) {
                    throw new Error(`Episode ${id} không thuộc về phim nào`);
                }

                console.log('🎬 [findOrCreateWatching] Found episode:', {
                    episodeId: id,
                    episodeTitle: targetEpisode.episode_title,
                    movieId: targetEpisode.movie_id._id,
                    movieTitle: targetEpisode.movie_id.movie_title,
                    movieType: targetEpisode.movie_id.movie_type,
                    duration: duration || targetEpisode.duration
                });
                
                watching = new this({
                    user_id: userId,
                    episode_id: id,
                    duration: duration || targetEpisode.duration
                });
                
                await watching.save();
                
            } else {
                // Not an Episode, try as Movie
                targetMovie = await this.model('Movie').findById(id);
                if (!targetMovie) {
                    throw new Error(`Neither Episode nor Movie found: ${id}`);
                }
                
                if (targetMovie.movie_type === 'series') {
                    throw new Error(`ID ${id} là phim bộ, vui lòng cung cấp episode_id`);
                }
                
                // For movies, check if there's an episode record, if not create one
                let movieEpisode = await this.model('Episode').findOne({ 
                    movie_id: id,
                    episode_number: 1 // Ensure we get the first episode
                });

                if (!movieEpisode) {
                    // Double check if we already have any episodes for this movie
                    const existingEpisodes = await this.model('Episode').find({ movie_id: id });
                    if (existingEpisodes.length > 0) {
                        movieEpisode = existingEpisodes[0]; // Use the first episode if exists
                        console.log('🎬 [findOrCreateWatching] Using existing episode:', {
                            movieId: id,
                            episodeId: movieEpisode._id,
                            episodeNumber: movieEpisode.episode_number
                        });
                    } else {
                        console.log('🎬 [findOrCreateWatching] Creating episode for movie:', id);
                        movieEpisode = await this.model('Episode').create({
                            movie_id: id,
                            episode_title: targetMovie.movie_title,
                            episode_number: 1,
                            duration: duration || targetMovie.duration,
                            video_url: targetMovie.video_url || targetMovie.uri,
                            is_free: targetMovie.is_free
                        });
                    }
                }
                
                console.log('🎬 [findOrCreateWatching] Using episode for movie:', {
                    movieId: id,
                    episodeId: movieEpisode._id,
                    movieTitle: targetMovie.movie_title,
                    duration: duration || targetMovie.duration
                });
                
                // Create watching record with the episode ID
                watching = new this({
                    user_id: userId,
                    episode_id: movieEpisode._id,
                    duration: duration || targetMovie.duration
                });
                
                await watching.save();
            }
            
            console.log('🎬 [findOrCreateWatching] Created new watching record:', {
                id: watching._id,
                user_id: userId,
                episode_id: watching.episode_id,
                duration: watching.duration
            });
            
        } else {
            console.log('🎬 [findOrCreateWatching] Found existing watching record:', {
                id: watching._id,
                current_time: watching.current_time,
                duration: watching.duration
            });
            
            if (duration && watching.duration !== duration) {
                console.log('🎬 [findOrCreateWatching] Updating duration:', {
                    old: watching.duration,
                    new: duration
                });
                watching.duration = duration;
                await watching.save();
            }
        }

        return watching;
    };

    // Method to complete a movie/episode with proper validation
    watchingSchema.statics.completeWatching = async function(userId, episodeId, currentTime = null, forceCompleted = false) {
        const watching = await this.findOrCreateWatching(userId, episodeId);
        
        // If currentTime is provided, update progress first
        if (currentTime !== null) {
            await watching.updateProgress(currentTime, forceCompleted);
        } else {
            // Check if eligible for completion based on current progress
            await watching.markCompleteIfEligible(forceCompleted);
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

    // Middleware
    watchingSchema.pre('save', async function(next) {
        if (this.isModified('current_time') || this.isModified('duration')) {
            // Tính completed dựa trên watch_percentage >= 95%
            this.completed = this.completed || 
                (this.duration > 0 && (this.current_time / this.duration) >= 0.95);
        }
        this.last_watched = new Date();
        next();
    });
};

module.exports = applyWatchingMethods; 