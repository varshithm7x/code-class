const axios = require('axios');

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
};

// Test 1: Sleep vs CPU computation timing
function generateSleepCode(testCases) {
  return `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    int t = ${testCases};
    cout << "Starting " << t << " test cases with SLEEP" << endl;
    
    for(int i = 1; i <= t; i++) {
        this_thread::sleep_for(chrono::seconds(1));
        cout << "Sleep test case " << i << " completed" << endl;
    }
    
    cout << "All " << t << " sleep test cases completed" << endl;
    return 0;
}`;
}

function generateCpuCode(testCases) {
  return `
#include <iostream>
#include <chrono>
using namespace std;

int main() {
    int t = ${testCases};
    cout << "Starting " << t << " test cases with CPU WORK" << endl;
    
    for(int i = 1; i <= t; i++) {
        auto start = chrono::high_resolution_clock::now();
        
        // CPU intensive work for approximately 1 second
        long long count = 0;
        while(true) {
            count++;
            if(count % 10000000 == 0) {
                auto now = chrono::high_resolution_clock::now();
                auto duration = chrono::duration_cast<chrono::milliseconds>(now - start);
                if(duration.count() >= 1000) break; // 1 second
            }
        }
        
        cout << "CPU test case " << i << " completed (count: " << count << ")" << endl;
    }
    
    cout << "All " << t << " CPU test cases completed" << endl;
    return 0;
}`;
}

async function testSingleSubmission(sourceCode, description, testCases) {
  console.log(`\n🧪 Testing: ${description}`);
  
  const submission = {
    source_code: sourceCode,
    language_id: 54,
    stdin: '',
    cpu_time_limit: 15,
    wall_time_limit: 20,
    memory_limit: 256000
  };
  
  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${JUDGE0_API_URL}/submissions?wait=true`,
      submission,
      { headers, timeout: 30000 }
    );
    const endTime = Date.now();
    
    const result = response.data;
    const wallTime = (endTime - startTime) / 1000;
    
    console.log(`📊 Results for ${testCases} test cases:`);
    console.log(`   • Status: ${result.status.description}`);
    console.log(`   • CPU Time: ${result.time}s`);
    console.log(`   • Wall Time: ${wallTime.toFixed(1)}s`);
    console.log(`   • Memory: ${result.memory} KB`);
    console.log(`   • Expected Time: ${testCases}s`);
    console.log(`   • Time per test case: ${(parseFloat(result.time) / testCases).toFixed(3)}s`);
    
    return {
      success: result.status.id === 3,
      cpuTime: parseFloat(result.time),
      wallTime: wallTime,
      testCases: testCases,
      description: description
    };
    
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.response?.data || error.message);
    return { success: false, description: description };
  }
}

async function testBatchSubmission(testCases, batchId) {
  console.log(`\n🧪 Batch ${batchId}: Testing ${testCases} test cases per source (20 files)`);
  console.log(`📊 Expected: 20 × ${testCases} = ${20 * testCases} total test cases`);
  
  const sourceCode = generateSleepCode(testCases);
  const batchSubmissions = [];
  
  for (let i = 0; i < 20; i++) {
    batchSubmissions.push({
      source_code: sourceCode,
      language_id: 54,
      stdin: '',
      cpu_time_limit: 15,
      wall_time_limit: 20,
      memory_limit: 256000
    });
  }
  
  try {
    const startTime = Date.now();
    
    // Submit batch
    const submitResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch`,
      { submissions: batchSubmissions },
      { headers, timeout: 60000 }
    );
    
    const submitTime = Date.now();
    const tokens = submitResponse.data;
    console.log(`📤 Batch submitted in ${((submitTime - startTime) / 1000).toFixed(1)}s`);
    
    // Wait for completion
    const waitTime = Math.max(testCases * 1000 + 10000, 15000);
    console.log(`⏳ Waiting ${Math.round(waitTime/1000)}s for completion...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Get results
    const tokenParams = tokens.map(token => token.token).join(',');
    const resultsResponse = await axios.get(
      `${JUDGE0_API_URL}/submissions/batch?tokens=${tokenParams}`,
      { headers }
    );
    
    const endTime = Date.now();
    const results = resultsResponse.data.submissions;
    
    const successCount = results.filter(r => r.status.id === 3).length;
    const avgCpuTime = results.reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / results.length;
    const maxCpuTime = Math.max(...results.map(r => parseFloat(r.time || 0)));
    const totalWallTime = (endTime - startTime) / 1000;
    
    console.log(`📊 Batch ${batchId} Results:`);
    console.log(`   • Successful: ${successCount}/20`);
    console.log(`   • Failed: ${20 - successCount}/20`);
    console.log(`   • Average CPU time: ${avgCpuTime.toFixed(3)}s`);
    console.log(`   • Maximum CPU time: ${maxCpuTime.toFixed(3)}s`);
    console.log(`   • Total wall time: ${totalWallTime.toFixed(1)}s`);
    console.log(`   • Test cases processed: ${successCount * testCases}`);
    
    return {
      batchId: batchId,
      testCases: testCases,
      successCount: successCount,
      avgCpuTime: avgCpuTime,
      maxCpuTime: maxCpuTime,
      totalWallTime: totalWallTime,
      testCasesProcessed: successCount * testCases
    };
    
  } catch (error) {
    console.log(`❌ Batch ${batchId} failed:`, error.response?.data || error.message);
    return { batchId: batchId, failed: true };
  }
}

async function testBackToBackBatches() {
  console.log(`\n🚀 Testing Back-to-Back Batch Submissions`);
  console.log(`================================================`);
  
  const testCases = 10; // Use 10 test cases per source for quick testing
  
  // Start both batches simultaneously
  const startTime = Date.now();
  
  console.log(`📤 Starting both batches simultaneously...`);
  const [batch1Promise, batch2Promise] = [
    testBatchSubmission(testCases, "A"),
    testBatchSubmission(testCases, "B")
  ];
  
  // Wait for both to complete
  const [batch1Result, batch2Result] = await Promise.all([batch1Promise, batch2Promise]);
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  console.log(`\n📊 Back-to-Back Results:`);
  console.log(`🕐 Total time for both batches: ${totalTime.toFixed(1)}s`);
  console.log(`📈 Batch A processed: ${batch1Result.testCasesProcessed || 0} test cases`);
  console.log(`📈 Batch B processed: ${batch2Result.testCasesProcessed || 0} test cases`);
  console.log(`🧮 Combined test cases: ${(batch1Result.testCasesProcessed || 0) + (batch2Result.testCasesProcessed || 0)}`);
  console.log(`⚡ Throughput: ${(((batch1Result.testCasesProcessed || 0) + (batch2Result.testCasesProcessed || 0)) / totalTime).toFixed(1)} test cases/second`);
  
  return { batch1Result, batch2Result, totalTime };
}

async function main() {
  console.log('🔬 Judge0 Timing Analysis & Replication Study');
  console.log('==============================================\n');
  
  if (!RAPIDAPI_KEY) {
    console.log('❌ No API key found');
    return;
  }
  
  // Phase 1: Compare Sleep vs CPU timing
  console.log('📋 PHASE 1: Sleep vs CPU Timing Comparison');
  console.log('==========================================');
  
  const sleepResult = await testSingleSubmission(generateSleepCode(3), "3 test cases with SLEEP", 3);
  const cpuResult = await testSingleSubmission(generateCpuCode(3), "3 test cases with CPU WORK", 3);
  
  console.log('\n🔍 Analysis:');
  if (sleepResult.success && cpuResult.success) {
    console.log(`   • Sleep approach CPU time: ${sleepResult.cpuTime}s`);
    console.log(`   • CPU work approach CPU time: ${cpuResult.cpuTime}s`);
    console.log(`   • Sleep counts as CPU time: ${sleepResult.cpuTime > 2 ? 'YES' : 'NO'}`);
    console.log(`   • CPU work counts as CPU time: ${cpuResult.cpuTime > 2 ? 'YES' : 'NO'}`);
  }
  
  // Phase 2: Replicate batch results multiple times
  console.log('\n📋 PHASE 2: Batch Result Replication');
  console.log('====================================');
  
  const replicationResults = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Replication ${i}/3 ---`);
    const result = await testBatchSubmission(15, i); // Test with 15 test cases
    replicationResults.push(result);
    
    // Small delay between replications
    if (i < 3) {
      console.log('⏸️  Waiting 5s before next replication...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Analyze replication consistency
  console.log('\n📊 Replication Analysis:');
  const successRates = replicationResults.map(r => r.successCount);
  const avgCpuTimes = replicationResults.map(r => r.avgCpuTime);
  
  console.log(`   • Success rates: ${successRates.join(', ')}/20`);
  console.log(`   • Average CPU times: ${avgCpuTimes.map(t => t.toFixed(3)).join(', ')}s`);
  console.log(`   • Results consistent: ${successRates.every(s => s === successRates[0]) ? 'YES' : 'NO'}`);
  
  // Phase 3: Back-to-back batch testing
  console.log('\n📋 PHASE 3: Back-to-Back Batch Testing');
  console.log('======================================');
  
  await testBackToBackBatches();
  
  console.log('\n🏆 STUDY COMPLETE');
  console.log('================');
  console.log('✅ Timing analysis completed');
  console.log('✅ Batch results replicated');
  console.log('✅ Back-to-back performance tested');
}

if (require.main === module) {
  main().catch(console.error);
} 