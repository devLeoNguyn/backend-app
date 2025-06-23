const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Episode = require('../models/Episode');

// MongoDB connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb+srv://quangloc:quangloc@cluster0.4tpzb.mongodb.net/movie-app?retryWrites=true&w=majority&appName=Cluster0';

async function updateMovieUri() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const movieId = '683d8d9b602b36157f1c7acf';
    const videoUri = 'https://customer-xir3z8gmfm10bn16.cloudflarestream.com/3bb459052887f59c52ba5d2700b45f82/manifest/video.m3u8';
    
    console.log('🎬 Updating movie URI...');
    console.log('Movie ID:', movieId);
    console.log('New URI:', videoUri);
    
    // Check if movie exists first
    const existingMovie = await Movie.findById(movieId);
    if (!existingMovie) {
      console.log('❌ Movie not found with ID:', movieId);
      process.exit(1);
    }
    
    console.log('📽️ Found movie:', existingMovie.movie_title);
    
    // Update movie URI
    const movieResult = await Movie.findByIdAndUpdate(
      movieId, 
      { 
        uri: videoUri, 
        video_url: videoUri 
      },
      { new: true }
    );
    
    console.log('✅ Movie updated successfully');
    console.log('- Title:', movieResult.movie_title);
    console.log('- New URI:', movieResult.uri);
    
    // Update episodes URI for this movie
    console.log('🎞️ Updating episodes for this movie...');
    const episodeResult = await Episode.updateMany(
      { movie_id: movieId },
      { 
        uri: videoUri, 
        video_url: videoUri 
      }
    );
    
    console.log('✅ Episodes updated:', episodeResult.modifiedCount, 'documents');
    
    // Verify updates
    const updatedEpisodes = await Episode.find({ movie_id: movieId });
    console.log('📋 Episodes list:');
    updatedEpisodes.forEach((ep, index) => {
      console.log(`  ${index + 1}. ${ep.episode_title} - URI: ${ep.uri ? 'Updated' : 'No URI'}`);
    });
    
    console.log('🎉 All updates completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating movie URI:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the update
updateMovieUri(); 