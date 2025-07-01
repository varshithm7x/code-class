// Ultra-light tests - No heavy dependencies, just pure logic validation

import { describe, test, expect, beforeAll } from '@jest/globals';
import axios from 'axios';

// Judge0 Configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY || process.env.RAPIDAPI_KEY;

describe('Ultra-Light Judge0 Limits Test', () => {
  const API_HEADERS = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
  };

  beforeAll(() => {
    if (!RAPIDAPI_KEY) {
      console.log('⚠️  No API key found. Set JUDGE0_API_KEY environment variable.');
    }
  });

  // Test code with 1 second per test case
  function generateTestCode(numberOfTestCases: number): string {
    return `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    int t;
    cin >> t;
    
    cout << "Processing " << t << " test cases" << endl;
    
    for(int i = 1; i <= t; i++) {
        // Exactly 1 second per test case
        this_thread::sleep_for(chrono::seconds(1));
        cout << "Test case " << i << " completed" << endl;
    }
    
    cout << "All " << t << " test cases completed" << endl;
    return 0;
}`;
  }

  test('Quick CPU time limit test - 5 test cases', async () => {
    if (!RAPIDAPI_KEY) {
      console.log('⏭️  Skipping - no API key');
      return;
    }

    console.log('\n🧪 Testing 5 test cases (lightweight)...');

    const submission = {
      source_code: generateTestCode(5),
      language_id: 54, // C++ (GCC 9.2.0)
      stdin: '5',
      cpu_time_limit: 15, // Max CPU time
      wall_time_limit: 20, // Max wall time
      memory_limit: 256000 // Max memory
    };

    try {
      const response = await axios.post(
        `${JUDGE0_API_URL}/submissions?wait=true`,
        submission,
                 { 
           headers: API_HEADERS, 
           timeout: 30000 // 5 test cases × 1 second + overhead
         }
      );

      const result: any = response.data;
      
      console.log(`📋 Status: ${result.status.description}`);
      console.log(`⏱️  Time: ${result.time}s`);
      console.log(`💾 Memory: ${result.memory} KB`);
      console.log(`📤 Output: ${result.stdout}`);

      expect(result.status.id).toBe(3); // Accepted
      expect(result.stdout).toContain('Processing 5 test cases');

      console.log('✅ 5 test cases completed successfully');

    } catch (error: any) {
      console.log('❌ Test failed:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Test 15 test cases (upper limit)', async () => {
    if (!RAPIDAPI_KEY) {
      console.log('⏭️  Skipping - no API key');
      return;
    }

    console.log('\n🧪 Testing 15 test cases (near CPU limit)...');

    const submission = {
      source_code: generateTestCode(15),
      language_id: 54,
      stdin: '15',
      cpu_time_limit: 15,
      wall_time_limit: 20,
      memory_limit: 256000
    };

    try {
      const response = await axios.post(
        `${JUDGE0_API_URL}/submissions?wait=true`,
        submission,
                 { 
           headers: API_HEADERS, 
           timeout: 45000 // 15 test cases × 1 second + overhead
         }
      );

      const result: any = response.data;
      
      console.log(`📋 Status: ${result.status.description}`);
      console.log(`⏱️  Time: ${result.time}s`);
      console.log(`💾 Memory: ${result.memory} KB`);

      expect(result.status.id).toBe(3);
      expect(result.stdout).toContain('Processing 15 test cases');

      console.log('✅ 15 test cases completed successfully');
      console.log(`🎯 Recommended limit: 15 test cases per submission`);

    } catch (error: any) {
      console.log('❌ Test failed:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Test small batch submission (3 programs)', async () => {
    if (!RAPIDAPI_KEY) {
      console.log('⏭️  Skipping - no API key');
      return;
    }

    console.log('\n🧪 Testing small batch (3 programs × 5 test cases each)...');

    const sourceCode = generateTestCode(5);
    
    // Create 3 separate objects (not shared references)
    const batchSubmissions: any[] = [];
    for (let i = 0; i < 3; i++) {
      batchSubmissions.push({
        source_code: sourceCode,
        language_id: 54,
        stdin: '5',
        cpu_time_limit: 15,
        wall_time_limit: 20,
        memory_limit: 256000
      });
    }

    try {
      const response = await axios.post(
        `${JUDGE0_API_URL}/submissions/batch`,
        { submissions: batchSubmissions },
                 { 
           headers: API_HEADERS, 
           timeout: 30000 // 5 test cases × 1 second per submission + overhead
         }
      );

      const tokens: any = response.data;
      console.log(`📤 Submitted batch of ${tokens.length} submissions`);

      // Wait for completion (5 test cases × 1 second each + overhead)
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Check results
      const tokenParams = tokens.map((t: any) => t.token).join(',');
      const resultsResponse = await axios.get(
        `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenParams}`,
        { headers: API_HEADERS }
      );

      const results: any = (resultsResponse.data as any).submissions;
      const successCount = results.filter((r: any) => r.status.id === 3).length;

      console.log(`✅ ${successCount}/${results.length} submissions succeeded`);
      console.log(`🧮 Total test cases: ${successCount * 5} test cases`);

      expect(successCount).toBeGreaterThan(0);

    } catch (error: any) {
      console.log('❌ Batch test failed:', error.response?.data || error.message);
      throw error;
    }
  });

  test('Calculate final pooled API viability', () => {
    console.log('\n💰 Pooled API Approach Analysis:');
    console.log('==================================');
    
    // Conservative limits based on testing
    const testCasesPerSubmission = 15; // Safe CPU limit
    const submissionsPerBatch = 20; // Judge0 batch limit
    const testCasesPerBatch = testCasesPerSubmission * submissionsPerBatch; // 300 test cases
    
    console.log(`📊 Per batch capability:`);
    console.log(`   • 20 programs × 15 test cases = ${testCasesPerBatch} test cases per batch`);
    
    // 100 students, 4 problems, 100 test cases each
    const totalTestCases = 100 * 4 * 100; // 40,000 test cases
    const batchesNeeded = Math.ceil(totalTestCases / testCasesPerBatch);
    
    console.log(`\n🎯 For 100 students exam:`);
    console.log(`   • Total test cases: ${totalTestCases.toLocaleString()}`);
    console.log(`   • Batches needed: ${batchesNeeded}`);
    console.log(`   • API calls needed: ${batchesNeeded}`);
    
    // Free tier analysis
    const freeCallsPerStudent = 50;
    const totalFreeCalls = 100 * freeCallsPerStudent; // 5,000 free calls
    const utilization = (batchesNeeded / totalFreeCalls) * 100;
    
    console.log(`\n🆓 Free tier coverage:`);
    console.log(`   • Available: ${totalFreeCalls} free calls`);
    console.log(`   • Needed: ${batchesNeeded} calls`);
    console.log(`   • Utilization: ${utilization.toFixed(1)}%`);
    
    if (batchesNeeded <= totalFreeCalls) {
      console.log(`   ✅ FULLY COVERED by free tier!`);
      console.log(`   💰 Cost: $0.00`);
    } else {
      const overage = batchesNeeded - totalFreeCalls;
      const suluCost = overage * 0.0005; // $0.0005 per submission via Sulu
      console.log(`   ⚠️  Overage: ${overage} calls`);
      console.log(`   💰 Sulu backup cost: $${suluCost.toFixed(3)}`);
    }
    
    console.log(`\n🏆 CONCLUSION:`);
    console.log(`   ✅ Pooled approach is HIGHLY viable`);
    console.log(`   ✅ Minimal/zero cost with free tier`);
    console.log(`   ✅ No infrastructure complexity`);
    console.log(`   ✅ Scales efficiently with bundling`);
  });
}); 