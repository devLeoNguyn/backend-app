const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://backend-app-lou3.onrender.com';
const movieId = '683d8d9b602b36157f1c7acf'; // Lawless movie ID
const videoUri = 'https://customer-xir3z8gmfm10bn16.cloudflarestream.com/3bb459052887f59c52ba5d2700b45f82/manifest/video.m3u8';

// Episode IDs từ console logs
const episodeIds = [
  '683d8d9b602b36157f1c7ad1', // Tập 1: Thành Phố Không Luật
  '683d8d9b602b36157f1c7ad2', // Tập 2: Bóng Tối Trong Công Lý  
  '683d8d9b602b36157f1c7ad3', // Tập 3: Kẻ Giám Sát
  '683d8d9b602b36157f1c7ad4', // Tập 4
  '683d8d9b602b36157f1c7ad5'  // Tập 5 (nếu có)
];

async function updateLawlessEpisodes() {
  try {
    console.log('🎬 Updating Lawless episodes...');
    console.log('Movie ID:', movieId);
    console.log('Video URI:', videoUri);
    console.log('Episodes to update:', episodeIds.length);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < episodeIds.length; i++) {
      const episodeId = episodeIds[i];
      
      try {
        console.log(`\n🎞️ Updating Episode ${i + 1}/${episodeIds.length}`);
        console.log('Episode ID:', episodeId);
        
        // First, get episode details
        const getResponse = await fetch(`${API_BASE}/api/episodes/${episodeId}`);
        
        if (!getResponse.ok) {
          console.log(`❌ Episode ${episodeId} not found`);
          errorCount++;
          continue;
        }
        
        const episodeData = await getResponse.json();
        const episode = episodeData.data.episode;
        
        console.log('📋 Episode:', episode.episode_title);
        console.log('Current URI:', episode.uri || 'NULL');
        
        // Update episode with new URI
        const updateResponse = await fetch(`${API_BASE}/api/episodes/${episodeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            episode_title: episode.episode_title,
            uri: videoUri,
            episode_number: episode.episode_number,
            episode_description: episode.episode_description
          })
        });
        
        if (updateResponse.ok) {
          const updatedData = await updateResponse.json();
          console.log('✅ Updated successfully');
          successCount++;
        } else {
          const errorData = await updateResponse.json();
          console.log('❌ Update failed:', errorData.message);
          errorCount++;
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error updating episode ${episodeId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Update Summary:');
    console.log(`✅ Success: ${successCount} episodes`);
    console.log(`❌ Errors: ${errorCount} episodes`);
    console.log(`📊 Total: ${episodeIds.length} episodes`);
    
    if (successCount > 0) {
      console.log('\n🔄 Please test the video playback in the app now!');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

updateLawlessEpisodes(); 