const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://backend-app-lou3.onrender.com';
const movieId = '683d8d9b602b36157f1c7acf';
const videoUri = 'https://customer-xir3z8gmfm10bn16.cloudflarestream.com/3bb459052887f59c52ba5d2700b45f82/manifest/video.m3u8';

async function updateMovieUriViaAPI() {
  try {
    console.log('🎬 Updating movie URI via API...');
    console.log('Movie ID:', movieId);
    console.log('New URI:', videoUri);
    
    // First, check if movie exists
    console.log('📋 Checking movie...');
    const checkResponse = await fetch(`${API_BASE}/api/movies/${movieId}/detail-with-interactions`);
    const checkData = await checkResponse.json();
    
    if (checkData.status !== 'success') {
      console.log('❌ Movie not found');
      return;
    }
    
    console.log('📽️ Found movie:', checkData.data.movie.movie_title);
    
    // Update movie via admin API (if exists) or create a simple update endpoint
    console.log('🔄 Attempting to update movie URI...');
    
    // Since we don't have a direct update API, let's create a simple approach
    // We'll use the existing episode API to update
    
    // First, get episodes for this movie
    const episodesResponse = await fetch(`${API_BASE}/api/episodes?movieId=${movieId}`);
    
    if (episodesResponse.ok) {
      const episodesData = await episodesResponse.json();
      console.log('📋 Found episodes:', episodesData.data?.length || 0);
      
      // If there are episodes, we can update them
      if (episodesData.data && episodesData.data.length > 0) {
        for (const episode of episodesData.data) {
          console.log(`🎞️ Would update episode: ${episode.episode_title}`);
          // Note: We would need an episode update API endpoint
        }
      }
    }
    
    console.log('ℹ️  To complete the update, you need to:');
    console.log('1. Add an admin API endpoint for updating movie URIs');
    console.log('2. Or update directly in MongoDB Atlas dashboard');
    console.log('3. Or provide the correct MONGO_URI for direct database access');
    
    console.log('\n📋 Database update commands:');
    console.log('For Movie collection:');
    console.log(`db.movies.updateOne({_id: ObjectId("${movieId}")}, {$set: {uri: "${videoUri}", video_url: "${videoUri}"}})`);
    
    console.log('\nFor Episodes collection:');
    console.log(`db.episodes.updateMany({movie_id: "${movieId}"}, {$set: {uri: "${videoUri}", video_url: "${videoUri}"}})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateMovieUriViaAPI(); 