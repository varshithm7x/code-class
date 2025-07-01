const axios = require('axios');

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY_2 || process.env.JUDGE0_API_KEY;
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Simple O(n) algorithm with configurable size
function generateAlgorithm(operations) {
    return `
#include <iostream>
using namespace std;

int main() {
    const int n = ${operations};
    long long sum = 0;
    
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    
    cout << "Sum: " << sum << endl;
    return 0;
}`;
}

async function submitAndWait(code, description) {
    try {
        console.log(`📤 Submitting: ${description}`);
        
        const submitResponse = await axios.post(
            `${JUDGE0_API_URL}/submissions?base64_encoded=true`,
            {
                source_code: Buffer.from(code).toString('base64'),
                language_id: 54, // C++17
                cpu_time_limit: 15,
                memory_limit: 128000
            },
            {
                headers: {
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                    'Content-Type': 'application/json'
                }
            }
        );

        const token = submitResponse.data.token;
        console.log(`   Token: ${token}`);

        // Wait longer for completion
        console.log(`⏳ Waiting 8 seconds for completion...`);
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Get result
        const resultResponse = await axios.get(
            `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=true`,
            {
                headers: {
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            }
        );

        const result = resultResponse.data;
        console.log(`📊 Results:`);
        console.log(`   ⏱️  CPU Time: ${result.time}s`);
        console.log(`   📦 Memory: ${result.memory} KB`);
        console.log(`   ✅ Status: ${result.status?.description || 'Unknown'}`);
        
        if (result.stderr) {
            console.log(`   ❌ Error: ${Buffer.from(result.stderr, 'base64').toString()}`);
        }

        return result;

    } catch (error) {
        console.error(`❌ Failed: ${error.response?.status} ${error.response?.statusText || error.message}`);
        return null;
    }
}

async function findOptimalOperations() {
    console.log('🔍 Finding Optimal Operation Count for 1 Second');
    console.log('===============================================');
    
    // Test different operation counts to find what gives ~1 second
    // Based on results: 200M ops = 0.106s, so we need ~2B ops for 1 second
    const testCounts = [
        500000000,   // 5 * 10^8
        1000000000,  // 10^9 (1 billion)
        1500000000,  // 1.5 * 10^9
        2000000000,  // 2 * 10^9 (2 billion)
        2500000000   // 2.5 * 10^9
    ];
    
    let bestCount = 2000000000;
    let bestTime = null;
    
    for (const count of testCounts) {
        console.log(`\n🧪 Testing ${count.toLocaleString()} operations`);
        
        const code = generateAlgorithm(count);
        const result = await submitAndWait(code, `${count.toLocaleString()} operations`);
        
        if (result && result.status?.id === 3) {
            const cpuTime = parseFloat(result.time || 0);
            console.log(`   🎯 CPU Time: ${cpuTime}s (target: ~1.0s)`);
            
            if (cpuTime > 0.8 && cpuTime < 1.2) {
                console.log(`   ✅ GOOD: Close to 1 second!`);
                bestCount = count;
                bestTime = cpuTime;
            } else if (cpuTime < 0.8) {
                console.log(`   ⬆️  Too fast, need more operations`);
            } else {
                console.log(`   ⬇️  Too slow, need fewer operations`);
            }
        } else {
            console.log(`   ❌ Failed or timed out`);
        }
        
        // Rate limiting delay
        console.log(`⏸️  Waiting 5 seconds before next test...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return { bestCount, bestTime };
}

async function testBatchConfiguration(operationsPerTest, testsPerFile) {
    console.log(`\n🏭 Testing Batch: ${testsPerFile} tests × ${operationsPerTest.toLocaleString()} ops each`);
    console.log(`⏱️  Expected CPU time: ${testsPerFile * (operationsPerTest / 2000000000)}s`);
    
    const code = `
#include <iostream>
using namespace std;

int main() {
    for (int test = 1; test <= ${testsPerFile}; test++) {
        const int n = ${operationsPerTest};
        long long sum = 0;
        
        for (int i = 1; i <= n; i++) {
            sum += i;
        }
        
        cout << "Test " << test << " Sum: " << sum << endl;
    }
    
    return 0;
}`;

    const result = await submitAndWait(code, `${testsPerFile} tests per file`);
    
    if (result && result.status?.id === 3) {
        const cpuTime = parseFloat(result.time || 0);
        console.log(`   ✅ SUCCESS: ${cpuTime}s CPU time`);
        return { success: true, cpuTime };
    } else if (result && result.status?.id === 5) {
        console.log(`   ⏰ TIME LIMIT EXCEEDED`);
        return { success: false, timeExceeded: true };
    } else {
        console.log(`   ❌ FAILED: ${result?.status?.description || 'Unknown error'}`);
        return { success: false, timeExceeded: false };
    }
}

async function findOptimalBatchSize(operationsPerTest) {
    console.log(`\n🎯 Finding Optimal Batch Size`);
    console.log(`===============================`);
    console.log(`Using ${operationsPerTest.toLocaleString()} operations per test case`);
    
    // Test incremental batch sizes
    for (let testCount = 1; testCount <= 15; testCount++) {
        const expectedTime = testCount * (operationsPerTest / 2000000000);
        
        if (expectedTime > 15) {
            console.log(`\n⚠️  Skipping ${testCount} tests (would exceed 15s limit)`);
            continue;
        }
        
        const result = await testBatchConfiguration(operationsPerTest, testCount);
        
        if (result.timeExceeded) {
            console.log(`\n🏆 OPTIMAL FOUND:`);
            console.log(`✅ Maximum tests per file: ${testCount - 1}`);
            console.log(`📊 Maximum batch capacity: ${20 * (testCount - 1)} test cases`);
            
            const maxBatchCapacity = 20 * (testCount - 1);
            const batchesFor40k = Math.ceil(40000 / maxBatchCapacity);
            console.log(`💰 For 40,000 test cases:`);
            console.log(`   📦 Batches needed: ${batchesFor40k}`);
            console.log(`   🆓 Free tier calls available: ${100 * 50}`);
            
            if (batchesFor40k <= 5000) {
                console.log(`   ✅ Fully covered by free tier!`);
            } else {
                console.log(`   ❌ Exceeds free tier`);
            }
            
            return testCount - 1;
        }
        
        if (!result.success) {
            console.log(`   ❌ Failed at ${testCount} tests, stopping`);
            return testCount - 1;
        }
        
        // Rate limiting delay
        console.log(`⏸️  Waiting 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    return 14; // Max we tested
}

async function main() {
    console.log('🧮 Careful Judge0 Batch Testing');
    console.log('===============================');
    console.log('Testing with proper rate limiting and delays\n');

    // Step 1: Find optimal operation count for ~1 second
    const { bestCount, bestTime } = await findOptimalOperations();
    
    if (bestTime) {
        console.log(`\n✨ Found optimal: ${bestCount.toLocaleString()} operations = ${bestTime}s`);
        
        // Step 2: Find optimal batch size
        const optimalTests = await findOptimalBatchSize(bestCount);
        
        console.log(`\n🎯 FINAL RESULTS:`);
        console.log(`================`);
        console.log(`• Operations per test: ${bestCount.toLocaleString()}`);
        console.log(`• CPU time per test: ~${bestTime}s`);
        console.log(`• Max tests per file: ${optimalTests}`);
        console.log(`• Max batch capacity: ${20 * optimalTests} test cases`);
        
    } else {
        console.log(`\n❌ Could not find optimal operation count`);
    }
}

main().catch(console.error); 