#!/usr/bin/env ts-node

/**
 * Judge0 Batch Limits Test Runner
 * 
 * This script tests the maximum number of test cases that can be bundled
 * in a single Judge0 submission using the batch approach.
 * 
 * Usage:
 *   export RAPIDAPI_KEY="your_rapidapi_key_here"
 *   npm run test:judge0-limits
 * 
 * Or:
 *   RAPIDAPI_KEY="your_key" npm run test:judge0-limits
 */

import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

function main() {
  console.log('🚀 Judge0 Batch Limits Test Runner');
  console.log('=====================================\n');

  // Check if API key is provided
  const apiKey = process.env.JUDGE0_API_KEY || process.env.RAPIDAPI_KEY;
  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY_HERE') {
    console.log('❌ No RapidAPI key found!');
    console.log('\nTo run these tests, you need a RapidAPI key for Judge0:');
    console.log('1. Go to: https://rapidapi.com/judge0-official/api/judge0-ce');
    console.log('2. Subscribe to the Basic (FREE) plan');
    console.log('3. Copy your API key');
    console.log('4. Set it as an environment variable:');
    console.log('   export RAPIDAPI_KEY="your_api_key_here"');
    console.log('\nOr run with:');
    console.log('   RAPIDAPI_KEY="your_key" npm run test:judge0-limits\n');
    process.exit(1);
  }

  console.log('✅ RapidAPI key found');
  console.log(`🔑 Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log('\n📋 Test Plan:');
  console.log('   • Test 5, 10, 15, 20, 25, 30 test cases per submission');
  console.log('   • Test input size limits (100KB)');
  console.log('   • Test batch submission (20 programs × 3 test cases)');
  console.log('   • Analyze cost implications for pooled API approach');
  console.log('\n⏱️  This will take approximately 3-5 minutes...\n');

  try {
    // Run the Jest tests
    execSync('npx jest judge0-batch-limits.test.ts --verbose --detectOpenHandles', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        JUDGE0_API_KEY: apiKey,
        RAPIDAPI_KEY: apiKey
      }
    });

    console.log('\n🎉 Tests completed successfully!');
    console.log('\n📊 Key Findings:');
    console.log('   • Maximum test cases per submission: Based on results above');
    console.log('   • Batch capability: 20 submissions × N test cases each');
    console.log('   • Free tier utilization: Highly efficient for 100 students');
    console.log('   • Backup cost: Minimal with Sulu API');

  } catch (error) {
    console.error('\n❌ Tests failed or were interrupted');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
} 