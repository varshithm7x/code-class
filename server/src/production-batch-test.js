const axios = require('axios');

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
};

// Calibrated algorithm: 25M operations = 0.852s CPU time
function generateProductionTestCode(testCases) {
  const operationsPerTestCase = 25000000; // Calibrated for ~0.85s per test case
  
  return `
#include <iostream>
#include <cmath>
#include <chrono>
using namespace std;

int main() {
    int totalTestCases = ${testCases};
    long long opsPerCase = ${operationsPerTestCase};
    
    cout << "Starting " << totalTestCases << " test cases (production simulation)" << endl;
    cout << "Operations per test case: " << opsPerCase << endl;
    
    for(int testCase = 1; testCase <= totalTestCases; testCase++) {
        auto start = chrono::high_resolution_clock::now();
        
        double result = 1.0;
        
        for(long long i = 1; i <= opsPerCase; i++) {
            // CPU-intensive computation (calibrated to ~0.85s)
            result += sqrt(i) * sin(i % 1000) + cos(i % 1000);
            result = fmod(result, 1000000.0);
        }
        
        auto end = chrono::high_resolution_clock::now();
        auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
        
        cout << "Test case " << testCase << " completed in " << duration.count() << "ms (result: " << result << ")" << endl;
    }
    
    cout << "All " << totalTestCases << " test cases completed successfully" << endl;
    return 0;
}`;
}

async function testProductionBatch(testCasesPerFile) {
  console.log(`\n🏭 PRODUCTION BATCH TEST: ${testCasesPerFile} test cases per source file`);
  console.log(`📊 Expected: 20 files × ${testCasesPerFile} test cases = ${20 * testCasesPerFile} total test cases`);
  console.log(`⏱️  Estimated CPU time per file: ${testCasesPerFile * 0.852}s`);
  
  const sourceCode = generateProductionTestCode(testCasesPerFile);
  
  // Create batch of 20 identical submissions
  const batchSubmissions = [];
  for (let i = 0; i < 20; i++) {
    batchSubmissions.push({
      source_code: sourceCode,
      language_id: 54,
      stdin: '',
      cpu_time_limit: 15, // 15 second CPU limit
      wall_time_limit: 20, // 20 second wall time limit
      memory_limit: 256000
    });
  }
  
  try {
    const startTime = Date.now();
    
    // Submit batch
    console.log('📤 Submitting batch of 20 submissions...');
    const submitResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch`,
      { submissions: batchSubmissions },
      { headers, timeout: 60000 }
    );
    
    const submitTime = Date.now();
    const tokens = submitResponse.data;
    console.log(`📋 Batch submitted in ${((submitTime - startTime) / 1000).toFixed(1)}s`);
    
    // Calculate wait time based on expected CPU time
    const expectedCpuTime = testCasesPerFile * 0.852;
    const waitTime = Math.max(expectedCpuTime * 1000 + 15000, 20000); // CPU time + overhead
    console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s for completion (${expectedCpuTime.toFixed(1)}s CPU + overhead)...`);
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Get results
    const tokenParams = tokens.map(token => token.token).join(',');
    const resultsResponse = await axios.get(
      `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenParams}`,
      { headers }
    );
    
    const endTime = Date.now();
    const results = resultsResponse.data.submissions;
    
    // Analyze results
    const successCount = results.filter(r => r.status.id === 3).length;
    const failedCount = 20 - successCount;
    const timeoutCount = results.filter(r => r.status.description === 'Time Limit Exceeded').length;
    
    const successfulResults = results.filter(r => r.status.id === 3);
    const avgCpuTime = successfulResults.length > 0 ? 
      successfulResults.reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / successfulResults.length : 0;
    const maxCpuTime = successfulResults.length > 0 ? 
      Math.max(...successfulResults.map(r => parseFloat(r.time || 0))) : 0;
    
    const totalWallTime = (endTime - startTime) / 1000;
    
    console.log(`\n📊 PRODUCTION BATCH RESULTS:`);
    console.log(`   ✅ Successful: ${successCount}/20`);
    console.log(`   ❌ Failed: ${failedCount}/20`);
    console.log(`   ⏰ Time Limit Exceeded: ${timeoutCount}/20`);
    console.log(`   📈 Test cases processed: ${successCount * testCasesPerFile}`);
    console.log(`   ⏱️  Average CPU time per file: ${avgCpuTime.toFixed(3)}s`);
    console.log(`   ⏱️  Maximum CPU time per file: ${maxCpuTime.toFixed(3)}s`);
    console.log(`   🕐 Total wall time: ${totalWallTime.toFixed(1)}s`);
    
    // Show failure reasons if any
    if (failedCount > 0) {
      const failureReasons = {};
      results.filter(r => r.status.id !== 3).forEach(r => {
        const reason = r.status.description;
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      });
      console.log(`   📋 Failure reasons:`, failureReasons);
    }
    
    // Determine if this configuration is viable for production
    const isViable = successCount >= 18 && maxCpuTime <= 14; // Allow up to 2 failures
    
    console.log(`\n🎯 PRODUCTION VIABILITY:`);
    if (isViable) {
      console.log(`   ✅ VIABLE: ${testCasesPerFile} test cases per file is production-ready`);
      console.log(`   📈 Batch capacity: 20 × ${testCasesPerFile} = ${20 * testCasesPerFile} test cases per batch`);
    } else {
      console.log(`   ❌ NOT VIABLE: ${testCasesPerFile} test cases per file exceeds limits`);
      if (timeoutCount > 0) {
        console.log(`   ⚠️  ${timeoutCount} submissions hit CPU time limit (15s)`);
      }
    }
    
    return {
      testCasesPerFile,
      successCount,
      failedCount,
      timeoutCount,
      avgCpuTime,
      maxCpuTime,
      totalWallTime,
      batchCapacity: successCount * testCasesPerFile,
      isViable
    };
    
  } catch (error) {
    console.log(`❌ Batch test failed:`, error.response?.data || error.message);
    return { testCasesPerFile, failed: true };
  }
}

async function findProductionLimits() {
  console.log('🏭 Production-Accurate Judge0 Batch Limit Testing');
  console.log('==================================================');
  console.log('Using calibrated algorithm: 25M operations = 0.852s CPU time per test case');
  console.log('Testing realistic CPU-intensive workloads that students might submit\n');
  
  // Calculate theoretical limits
  const cpuTimePerTestCase = 0.852;
  const cpuLimit = 15; // seconds
  const theoreticalMax = Math.floor(cpuLimit / cpuTimePerTestCase);
  
  console.log(`📊 Theoretical Analysis:`);
  console.log(`   • CPU time per test case: ${cpuTimePerTestCase}s`);
  console.log(`   • CPU time limit: ${cpuLimit}s`);
  console.log(`   • Theoretical max test cases: ${theoreticalMax}`);
  console.log(`   • Testing around this limit...\n`);
  
  // Test values around the theoretical limit
  const testValues = [
    Math.max(1, theoreticalMax - 3),
    Math.max(1, theoreticalMax - 2), 
    Math.max(1, theoreticalMax - 1),
    theoreticalMax,
    theoreticalMax + 1,
    theoreticalMax + 2
  ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
  
  console.log(`🧪 Testing values: ${testValues.join(', ')}\n`);
  
  const results = [];
  
  for (const testCases of testValues) {
    const result = await testProductionBatch(testCases);
    results.push(result);
    
    // If we hit failures, we've likely found the limit
    if (!result.isViable) {
      console.log(`\n🚫 Hit limit at ${testCases} test cases per file`);
      break;
    }
    
    // Delay between tests
    console.log('⏸️  Waiting 5s before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Find optimal configuration
  const viableResults = results.filter(r => r.isViable);
  const optimalResult = viableResults.length > 0 ? 
    viableResults[viableResults.length - 1] : null;
  
  console.log('\n🏆 PRODUCTION LIMITS FOUND:');
  console.log('===========================');
  
  if (optimalResult) {
    console.log(`✅ Maximum test cases per source file: ${optimalResult.testCasesPerFile}`);
    console.log(`✅ Maximum batch capacity: ${optimalResult.batchCapacity} test cases`);
    console.log(`⏱️  Average CPU time per file: ${optimalResult.avgCpuTime.toFixed(3)}s`);
    console.log(`⏱️  Maximum CPU time per file: ${optimalResult.maxCpuTime.toFixed(3)}s`);
    
    // Calculate implications for 100 students
    const totalTestCases = 100 * 4 * 100; // 100 students × 4 problems × 100 test cases
    const batchesNeeded = Math.ceil(totalTestCases / optimalResult.batchCapacity);
    const freeCallsAvailable = 100 * 50; // 5,000 free calls
    
    console.log(`\n💰 PRODUCTION COST ANALYSIS:`);
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
    
    console.log(`\n🏆 FINAL PRODUCTION ASSESSMENT:`);
    console.log(`✅ Pooled API approach validated with production workloads`);
    console.log(`✅ Each test case uses realistic CPU time (${cpuTimePerTestCase}s)`);
    console.log(`✅ Batch capacity: ${optimalResult.batchCapacity} test cases`);
    console.log(`✅ Cost-effective and scalable solution`);
    
  } else {
    console.log(`❌ Could not find viable production configuration`);
    console.log(`⚠️  All tested configurations exceeded Judge0 limits`);
  }
}

async function main() {
  if (!RAPIDAPI_KEY) {
    console.log('❌ No API key found');
    return;
  }
  
  await findProductionLimits();
}

if (require.main === module) {
  main().catch(console.error);
} 