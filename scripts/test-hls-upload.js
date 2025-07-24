/**
 * 🧪 TEST UPLOAD WITH HLS MANIFEST URL
 * Script để test việc upload video và trả về HLS Manifest URL
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 🌐 Configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const TEST_VIDEO_PATH = '/path/to/test-video.mp4'; // Update với path thực tế
const TEST_EPISODE_ID = 'your_episode_id_here'; // Update với Episode ID thực tế

/**
 * 🧪 Test upload video và kiểm tra HLS Manifest URL
 */
async function testVideoUpload() {
    try {
        console.log('🧪 Testing video upload with HLS Manifest URL...');
        
        // Kiểm tra file test video có tồn tại không
        if (!fs.existsSync(TEST_VIDEO_PATH)) {
            console.log('⚠️ Test video file not found. Creating a dummy test...');
            await testWithoutFile();
            return;
        }
        
        // 📤 Tạo FormData
        const formData = new FormData();
        formData.append('file', fs.createReadStream(TEST_VIDEO_PATH));
        formData.append('episodeId', TEST_EPISODE_ID);
        formData.append('movieTitle', 'Test Movie');
        formData.append('episodeTitle', 'Test Episode');
        
        // 🚀 Upload request
        console.log('📤 Uploading test video...');
        const response = await axios.post(`${API_BASE_URL}/api/upload/video`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 60000 // 1 phút timeout
        });
        
        // ✅ Kiểm tra response
        if (response.data.status === 'success') {
            const data = response.data.data;
            
            console.log('✅ Upload successful! Response data:');
            console.log('📋 Episode ID:', data.episodeId);
            console.log('🆔 Stream UID:', data.streamUid);
            console.log('🎬 HLS Manifest URL:', data.hlsManifestUrl);
            console.log('📊 Upload Status:', data.uploadStatus);
            console.log('🎯 Processing Status:', data.processingStatus);
            
            // 🔍 Validate HLS URL format
            const expectedPattern = new RegExp(`https://customer-[a-f0-9]+\\.cloudflarestream\\.com/${data.streamUid}/manifest/video\\.m3u8`);
            if (expectedPattern.test(data.hlsManifestUrl)) {
                console.log('✅ HLS Manifest URL format is correct!');
            } else {
                console.log('❌ HLS Manifest URL format is incorrect!');
                console.log('Expected pattern: https://customer-{accountId}.cloudflarestream.com/{uid}/manifest/video.m3u8');
                console.log('Actual URL:', data.hlsManifestUrl);
            }
            
            // 🧪 Test URL accessibility (optional)
            await testHLSAccessibility(data.hlsManifestUrl, data.streamUid);
            
        } else {
            console.log('❌ Upload failed:', response.data.message);
        }
        
    } catch (error) {
        console.error('❌ Test upload error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

/**
 * 🧪 Test without actual file (checking API structure)
 */
async function testWithoutFile() {
    try {
        console.log('🧪 Testing upload endpoint structure...');
        
        const formData = new FormData();
        formData.append('episodeId', 'test_episode_id');
        
        const response = await axios.post(`${API_BASE_URL}/api/upload/video`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            timeout: 10000,
            validateStatus: () => true // Accept all status codes
        });
        
        console.log('📋 API Response Structure:');
        console.log('Status Code:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log('📋 Expected error for no file:', error.message);
    }
}

/**
 * 🔍 Test HLS URL accessibility
 */
async function testHLSAccessibility(hlsUrl, streamUid) {
    try {
        console.log('🔍 Testing HLS URL accessibility...');
        
        // Note: Newly uploaded videos might not be immediately accessible
        // This is expected behavior during processing
        const response = await axios.head(hlsUrl, {
            timeout: 5000,
            validateStatus: () => true
        });
        
        if (response.status === 200) {
            console.log('✅ HLS URL is accessible!');
        } else if (response.status === 404) {
            console.log('⏳ HLS URL not accessible yet (video might be processing)');
        } else {
            console.log(`ℹ️ HLS URL returned status: ${response.status}`);
        }
        
    } catch (error) {
        console.log('ℹ️ HLS URL accessibility test failed (this is normal for processing videos):', error.message);
    }
}

/**
 * 🧪 Test việc extract Stream UID từ HLS URL
 */
function testExtractStreamUid() {
    console.log('🧪 Testing Stream UID extraction from HLS URLs...');
    
    const testCases = [
        {
            name: 'HLS Manifest URL',
            url: 'https://customer-abc123.cloudflarestream.com/abc123def456789/manifest/video.m3u8',
            expected: 'abc123def456789'
        },
        {
            name: 'General Stream URL',
            url: 'https://customer-abc123.cloudflarestream.com/abc123def456789',
            expected: 'abc123def456789'
        },
        {
            name: 'Raw Stream UID',
            url: 'abc123def456789',
            expected: 'abc123def456789'
        },
        {
            name: 'Invalid URL',
            url: 'https://example.com/video.mp4',
            expected: null
        }
    ];
    
    // Simulate extractStreamUid function
    function extractStreamUid(uri) {
        if (!uri) return null;
        
        // Check if it's already a UID
        if (uri.match(/^[a-f0-9]{32}$/i)) {
            return uri;
        }
        
        // Extract from HLS or general Cloudflare URLs
        if (uri.includes('cloudflarestream.com')) {
            const hlsMatch = uri.match(/cloudflarestream\.com\/([a-f0-9]{32})\/manifest/i);
            if (hlsMatch) return hlsMatch[1];
            
            const generalMatch = uri.match(/cloudflarestream\.com\/([a-f0-9]{32})/i);
            if (generalMatch) return generalMatch[1];
        }
        
        return null;
    }
    
    testCases.forEach((testCase, index) => {
        const result = extractStreamUid(testCase.url);
        const passed = result === testCase.expected;
        console.log(`${passed ? '✅' : '❌'} Test ${index + 1} (${testCase.name}): ${passed ? 'PASSED' : 'FAILED'}`);
        if (!passed) {
            console.log(`   Expected: ${testCase.expected}`);
            console.log(`   Got: ${result}`);
        }
    });
}

// 🚀 Run tests
async function runTests() {
    console.log('🧪 === CLOUDFLARE STREAM HLS UPLOAD TESTS ===\n');
    
    // Test 1: Extract Stream UID function
    testExtractStreamUid();
    console.log('');
    
    // Test 2: Upload API (nếu có file test)
    await testVideoUpload();
    
    console.log('\n🧪 === TESTS COMPLETED ===');
}

// Run if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testVideoUpload,
    testExtractStreamUid,
    runTests
};
