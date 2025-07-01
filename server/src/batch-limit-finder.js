const axios = require('axios');

// Batch Limit Finder for Judge0 API
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

function generateSourceCodeWithTTestCases(t) {
  return `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    int testCases = ${t}; // Fixed number of test cases
    
    cout << "Starting " << testCases << " test cases" << endl;
    
    for(int i = 1; i <= testCases; i++) {
        // Exactly 1 second per test case (minimum and maximum)
        this_thread::sleep_for(chrono::seconds(1));
        cout << "Test case " << i << " completed" << endl;
    }
    
    cout << "All " << testCases << " test cases completed successfully" << endl;
    return 0;
}`;
}

async function testBatchWithTTestCases(t) {
  console.log(`\n🧪 Testing batch with ${t} test cases per source file...`);
  console.log(`📊 Expected: 20 submissions × ${t} test cases = ${20 * t} total test cases`);
  
  if (!RAPIDAPI_KEY) {
    console.log('❌ No API key found');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
  };
  
  // Generate source code that processes t test cases
  const sourceCode = generateSourceCodeWithTTestCases(t);
  
  // Create batch of 20 identical submissions
  const batchSubmissions = [];
  for (let i = 0; i < 20; i++) {
    batchSubmissions.push({
      source_code: sourceCode,
      language_id: 54, // C++
      stdin: '',
      cpu_time_limit: 15, // Maximum CPU time
      wall_time_limit: 20, // Maximum wall time
      memory_limit: 256000 // Maximum memory
    });
  }
  
  try {
    console.log('📤 Submitting batch of 20 submissions...');
    const startTime = Date.now();
    
    // Submit batch
    const response = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch`,
      { submissions: batchSubmissions },
      { 
        headers, 
        timeout: 60000 // 1 minute timeout
      }
    );
    
    const tokens = response.data;
    console.log(`📋 Batch submitted: ${tokens.length} submissions`);
    
    // Wait for completion (t test cases × 1 second each + overhead)
    const waitTime = Math.max(t * 1000 + 10000, 15000); // At least 15 seconds
    console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s for completion...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Check results
    const tokenParams = tokens.map(token => token.token).join(',');
    const resultsResponse = await axios.get(
      `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenParams}`,
      { headers }
    );
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
    
    const results = resultsResponse.data.submissions;
    const successCount = results.filter(r => r.status.id === 3).length; // Accepted
    const failureCount = results.length - successCount;
    
    console.log(`\n📊 BATCH RESULTS:`);
    console.log(`✅ Successful submissions: ${successCount}/20`);
    console.log(`❌ Failed submissions: ${failureCount}/20`);
    console.log(`🕐 Total batch time: ${totalTime.toFixed(1)}s`);
    
    if (successCount > 0) {
      // Analyze individual submission performance
      const successfulResults = results.filter(r => r.status.id === 3);
      const avgCpuTime = successfulResults.reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / successfulResults.length;
      const maxCpuTime = Math.max(...successfulResults.map(r => parseFloat(r.time || 0)));
      
      console.log(`⏱️  Average CPU time per submission: ${avgCpuTime.toFixed(2)}s`);
      console.log(`⏱️  Maximum CPU time per submission: ${maxCpuTime.toFixed(2)}s`);
      console.log(`🧮 Test cases processed successfully: ${successCount * t}`);
      
      // Check if outputs are correct
      const correctOutputs = successfulResults.filter(r => 
        r.stdout && 
        r.stdout.includes(`Starting ${t} test cases`) &&
        r.stdout.includes(`All ${t} test cases completed successfully`)
      ).length;
      
      console.log(`✅ Correct outputs: ${correctOutputs}/${successCount}`);
      
      // Determine if this configuration is viable
      const isViable = successCount >= 18 && maxCpuTime <= 14 && correctOutputs >= 18; // Allow 2 failures
      
      if (isViable) {
        console.log(`🎉 SUCCESS: ${t} test cases per source file is VIABLE!`);
        console.log(`📈 Batch capacity: 20 × ${t} = ${20 * t} test cases per batch`);
        return { viable: true, testCasesPerFile: t, batchCapacity: 20 * t };
      } else {
        console.log(`⚠️  MARGINAL: ${t} test cases per source file may be at the limit`);
        return { viable: false, testCasesPerFile: t, batchCapacity: 20 * t };
      }
    } else {
      console.log(`❌ FAILED: ${t} test cases per source file exceeded limits`);
      
      // Show failure reasons
      const failureReasons = {};
      results.forEach(r => {
        const reason = r.status.description;
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });
      
      console.log(`📋 Failure reasons:`, failureReasons);
      return { viable: false, testCasesPerFile: t, batchCapacity: 0 };
    }
    
  } catch (error) {
    console.log(`❌ API ERROR for ${t} test cases:`, error.response?.data || error.message);
    return { viable: false, testCasesPerFile: t, batchCapacity: 0 };
  }
}

async function findOptimalBatchLimit() {
  console.log('🚀 Finding Optimal Batch Limit for Judge0 API');
  console.log('==============================================');
  console.log('🎯 Goal: Find max test cases per source file in batch submission');
  console.log('📐 Constraint: Each test case takes exactly 1 second\n');
  
  // Test different values of t (test cases per source file)
  const testValues = [3, 5, 8, 10, 12, 15, 18, 20];
  const results = [];
  
  for (const t of testValues) {
    const result = await testBatchWithTTestCases(t);
    results.push(result);
    
    // If we hit a failure, we might have found the limit
    if (!result.viable && t > 5) {
      console.log(`\n🔍 Hit limit at ${t}, testing intermediate values...`);
      
      // Test intermediate values
      const prevViable = results[results.length - 2];
      if (prevViable && prevViable.viable) {
        for (let intermediate = prevViable.testCasesPerFile + 1; intermediate < t; intermediate++) {
          const intermediateResult = await testBatchWithTTestCases(intermediate);
          results.push(intermediateResult);
          if (!intermediateResult.viable) break;
        }
      }
      break;
    }
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Find the optimal configuration
  const viableResults = results.filter(r => r.viable);
  const optimalResult = viableResults.length > 0 ? 
    viableResults[viableResults.length - 1] : 
    { testCasesPerFile: 0, batchCapacity: 0 };
  
  console.log('\n🏆 FINAL RESULTS:');
  console.log('================');
  
  if (optimalResult.testCasesPerFile > 0) {
    console.log(`✅ Optimal test cases per source file: ${optimalResult.testCasesPerFile}`);
    console.log(`✅ Optimal batch capacity: ${optimalResult.batchCapacity} test cases`);
    
    // Calculate implications for 100 students
    const totalTestCases = 100 * 4 * 100; // 100 students × 4 problems × 100 test cases
    const batchesNeeded = Math.ceil(totalTestCases / optimalResult.batchCapacity);
    const freeCallsAvailable = 100 * 50; // 5,000 free calls
    
    console.log(`\n💰 COST ANALYSIS FOR 100 STUDENTS:`);
    console.log(`📊 Total test cases needed: ${totalTestCases.toLocaleString()}`);
    console.log(`📊 Batches needed: ${batchesNeeded}`);
    console.log(`📊 Free API calls available: ${freeCallsAvailable.toLocaleString()}`);
    console.log(`📊 Utilization: ${((batchesNeeded / freeCallsAvailable) * 100).toFixed(1)}%`);
    
    if (batchesNeeded <= freeCallsAvailable) {
      console.log(`🎉 FULLY COVERED by free tier! Cost: $0.00`);
    } else {
      const overage = batchesNeeded - freeCallsAvailable;
      console.log(`⚠️  Overage: ${overage} calls`);
      console.log(`💰 Sulu backup cost: $${(overage * 0.0005).toFixed(3)}`);
    }
    
    console.log(`\n🏆 CONCLUSION: Pooled API approach is HIGHLY VIABLE!`);
    
  } else {
    console.log(`❌ Could not find viable configuration`);
    console.log(`⚠️  Judge0 free tier may have stricter limits than expected`);
  }
}

// Run the batch limit finder
if (require.main === module) {
  findOptimalBatchLimit().catch(console.error);
} 