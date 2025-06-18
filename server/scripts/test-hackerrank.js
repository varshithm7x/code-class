const { fetchHackerRankSubmissions } = require('../src/services/hackerrank.service');

// Test script to verify HackerRank service functionality
async function testHackerRankService() {
  console.log('🔶 Testing HackerRank service...');
  
  // You would use a real session cookie here for testing
  const testCookie = 'test_cookie_value';
  
  try {
    console.log('Testing submission fetch...');
    const submissions = await fetchHackerRankSubmissions(testCookie, 5);
    console.log(`Found ${submissions.length} submissions`);
    
    if (submissions.length > 0) {
      console.log('Sample submission:', submissions[0]);
    }
    
    console.log('✅ HackerRank service test completed successfully');
  } catch (error) {
    console.error('❌ HackerRank service test failed:', error.message);
    // This is expected with a test cookie
    if (error.message.includes('expired') || error.message.includes('invalid')) {
      console.log('✅ Error handling working correctly - invalid cookie detected');
    }
  }
}

if (require.main === module) {
  testHackerRankService();
}

module.exports = { testHackerRankService }; 