import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import the enhanced functions
import { getAllLeetCodeSolvedSlugsEnhanced, getAllLeetCodeSolvedSlugs, getLeetCodeUserStats } from '../src/services/submission.service';

const LEETCODE_USERNAME = 'Die_hard-PROGRAmmer';

const testEnhancedSubmissionService = async () => {
  console.log('🚀 Testing Enhanced LeetCode Submission Discovery');
  console.log(`Target user: ${LEETCODE_USERNAME}\n`);

  try {
    // Test 1: Get user stats to see the total solved count
    console.log('📊 Step 1: Getting user statistics...');
    const userStats = await getLeetCodeUserStats(LEETCODE_USERNAME);
    console.log(`User has solved ${userStats.totalSolved} problems total\n`);

    // Test 2: Test original method
    console.log('📋 Step 2: Testing original method...');
    const originalSlugs = await getAllLeetCodeSolvedSlugs(LEETCODE_USERNAME);
    console.log(`Original method found: ${originalSlugs.size} problems\n`);

    // Test 3: Test enhanced method
    console.log('🚀 Step 3: Testing enhanced method...');
    const enhancedSlugs = await getAllLeetCodeSolvedSlugsEnhanced(LEETCODE_USERNAME);
    console.log(`Enhanced method found: ${enhancedSlugs.size} problems\n`);

    // Test 4: Compare results
    console.log('📊 Step 4: Analysis and Comparison');
    console.log('=====================================');
    console.log(`Total problems solved (LeetCode profile): ${userStats.totalSolved}`);
    console.log(`Original method discovered: ${originalSlugs.size}`);
    console.log(`Enhanced method discovered: ${enhancedSlugs.size}`);
    console.log(`Improvement: +${enhancedSlugs.size - originalSlugs.size} problems`);
    
    const originalCoverage = userStats.totalSolved > 0 ? ((originalSlugs.size / userStats.totalSolved) * 100).toFixed(1) : '0';
    const enhancedCoverage = userStats.totalSolved > 0 ? ((enhancedSlugs.size / userStats.totalSolved) * 100).toFixed(1) : '0';
    
    console.log(`Original coverage: ${originalCoverage}%`);
    console.log(`Enhanced coverage: ${enhancedCoverage}%`);

    // Show some of the discovered problems
    if (enhancedSlugs.size > 0) {
      console.log(`\nFirst 10 discovered problems:`, Array.from(enhancedSlugs).slice(0, 10));
    }

    // Show improvement details
    const onlyInEnhanced = new Set([...enhancedSlugs].filter(x => !originalSlugs.has(x)));
    if (onlyInEnhanced.size > 0) {
      console.log(`\n🎯 Additional problems found by enhanced method (${onlyInEnhanced.size}):`, Array.from(onlyInEnhanced));
    }

    console.log('\n✅ Enhanced submission discovery test completed!');
    console.log(`\n💡 Key Insight: Even with enhancements, we can only discover ~${enhancedSlugs.size} out of ${userStats.totalSolved} problems`);
    console.log(`   This is due to LeetCode API limitations that restrict access to recent submissions only.`);
    console.log(`   For comprehensive tracking, consider implementing a progressive cache over time.`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testEnhancedSubmissionService().catch(console.error); 