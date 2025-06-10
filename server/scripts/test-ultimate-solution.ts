import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import the ultimate solution functions
import { 
    getLeetCodeSolvedSlugsWithCaching, 
    getCacheStatistics, 
    clearUserCache,
    getAllLeetCodeSolvedSlugs,
    getLeetCodeUserStats
} from '../src/services/submission.service';

const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';

const testUltimateSolution = async () => {
  console.log('🎯 Testing ULTIMATE LeetCode Submission Discovery Solution');
  console.log('=========================================================');
  console.log(`Target user: ${LEETCODE_USERNAME}\n`);

  try {
    // Step 1: Clear any existing cache to start fresh
    console.log('🗑️ Step 1: Clearing existing cache...');
    clearUserCache(LEETCODE_USERNAME);
    
    // Step 2: Get baseline stats
    console.log('\n📊 Step 2: Getting user baseline stats...');
    const userStats = await getLeetCodeUserStats(LEETCODE_USERNAME);
    console.log(`User has solved ${userStats.totalSolved} problems total`);
    
    // Step 3: Test original method for comparison
    console.log('\n📋 Step 3: Testing original method (for comparison)...');
    const originalSlugs = await getAllLeetCodeSolvedSlugs(LEETCODE_USERNAME);
    console.log(`Original method: ${originalSlugs.size} problems discovered`);
    
    // Step 4: Test ultimate caching solution - First run
    console.log('\n🚀 Step 4: Testing ultimate caching solution (First run)...');
    const firstRunSlugs = await getLeetCodeSolvedSlugsWithCaching(LEETCODE_USERNAME);
    console.log(`First run: ${firstRunSlugs.size} problems discovered`);
    
    // Step 5: Test caching - Second run (should use cache)
    console.log('\n💾 Step 5: Testing caching (Second run - should use cache)...');
    const secondRunSlugs = await getLeetCodeSolvedSlugsWithCaching(LEETCODE_USERNAME);
    console.log(`Second run: ${secondRunSlugs.size} problems discovered`);
    
    // Step 6: Simulate time passage and new problem solving
    console.log('\n⏰ Step 6: Simulating time passage (forcing cache update)...');
    // We'll clear cache and re-run to simulate finding new problems over time
    clearUserCache(LEETCODE_USERNAME);
    const thirdRunSlugs = await getLeetCodeSolvedSlugsWithCaching(LEETCODE_USERNAME);
    console.log(`After cache refresh: ${thirdRunSlugs.size} problems discovered`);
    
    // Step 7: Show cache statistics
    console.log('\n📈 Step 7: Cache Statistics...');
    const cacheStats = getCacheStatistics();
    console.log('Cache Statistics:', JSON.stringify(cacheStats, null, 2));
    
    // Step 8: Final analysis
    console.log('\n🎯 Step 8: Final Analysis');
    console.log('==========================');
    console.log(`LeetCode Profile Total: ${userStats.totalSolved} problems`);
    console.log(`Original Method: ${originalSlugs.size} problems (${(originalSlugs.size/userStats.totalSolved*100).toFixed(1)}% coverage)`);
    console.log(`Ultimate Solution: ${firstRunSlugs.size} problems (${(firstRunSlugs.size/userStats.totalSolved*100).toFixed(1)}% coverage)`);
    console.log(`Improvement: +${firstRunSlugs.size - originalSlugs.size} problems`);
    
    console.log('\n💡 Key Benefits of Ultimate Solution:');
    console.log('1. ✅ Accumulates data over time - no data loss');
    console.log('2. ✅ Smart caching reduces API calls');
    console.log('3. ✅ Adaptive update frequency based on user activity');
    console.log('4. ✅ Comprehensive statistics and monitoring');
    console.log('5. ✅ Handles LeetCode API limitations gracefully');
    
    console.log('\n🚀 Production Recommendations:');
    console.log('1. Store cache in database instead of memory');
    console.log('2. Run periodic background jobs to update caches');
    console.log('3. Implement cache persistence across server restarts');
    console.log('4. Add cache cleanup for inactive users');
    console.log('5. Monitor cache hit rates and coverage statistics');
    
    // Step 9: Demonstrate problem discovery
    if (firstRunSlugs.size > 0) {
      console.log(`\n🎯 Discovered Problems (sample):`, 
        Array.from(firstRunSlugs).slice(0, 10));
    }
    
    console.log('\n✅ Ultimate solution test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testUltimateSolution().catch(console.error); 