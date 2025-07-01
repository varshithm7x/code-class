const fs = require('fs');
const axios = require('axios');

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Simple O(n) algorithm: sum of array elements
// Based on research: 10^8 operations = ~1 second
function generateOneSecondAlgorithm() {
    return `
#include <iostream>
using namespace std;

int main() {
    // Simple O(n) algorithm: 10^8 operations = ~1 second
    const int n = 100000000; // 10^8
    long long sum = 0;
    
    for (int i = 1; i <= n; i++) {
        sum += i; // Simple addition operation
    }
    
    cout << "Sum: " << sum << endl;
    return 0;
}`;
}

async function testSingleExecution() {
    console.log('🧪 Testing Single Algorithm Execution (10^8 operations)');
    console.log('===================================================');
    
    const code = generateOneSecondAlgorithm();
    
    try {
        // Submit the code
        const submitResponse = await axios.post(
            `${JUDGE0_API_URL}/submissions`,
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
        console.log(`📤 Submitted algorithm, token: ${token}`);

        // Wait for completion
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get result
        const resultResponse = await axios.get(
            `${JUDGE0_API_URL}/submissions/${token}`,
            {
                headers: {
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            }
        );

        const result = resultResponse.data;
        console.log('📊 ALGORITHM TEST RESULTS:');
        console.log(`   ⏱️  CPU Time: ${result.time}s`);
        console.log(`   📦 Memory: ${result.memory} KB`);
        console.log(`   ✅ Status: ${result.status?.description || 'Unknown'}`);
        console.log(`   📤 Output: ${result.stdout ? Buffer.from(result.stdout, 'base64').toString() : 'None'}`);
        
        if (result.stderr) {
            console.log(`   ❌ Error: ${Buffer.from(result.stderr, 'base64').toString()}`);
        }

        return result;

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return null;
    }
}

// Incremental batch testing - start with very small numbers
async function testIncrementalBatch() {
    console.log('\n🏭 INCREMENTAL BATCH TESTING');
    console.log('============================');
    console.log('Testing with simple O(n) algorithm: 10^8 operations = ~1 second');
    console.log('Starting with very small batch sizes...\n');

    const testCases = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    for (const testCaseCount of testCases) {
        console.log(`🧪 Testing ${testCaseCount} test case(s) per source file`);
        console.log(`📊 Expected: 20 files × ${testCaseCount} test cases = ${20 * testCaseCount} total test cases`);
        console.log(`⏱️  Estimated CPU time per file: ${testCaseCount * 1.0}s`);
        
        if (testCaseCount * 1.0 > 15) {
            console.log('⚠️  Expected to exceed 15s CPU limit - skipping');
            console.log('');
            continue;
        }
        
        const batchResults = await testBatch(testCaseCount);
        
        if (batchResults) {
            const successful = batchResults.filter(r => r.status?.id === 3).length;
            const failed = batchResults.filter(r => r.status?.id !== 3).length;
            const timeExceeded = batchResults.filter(r => r.status?.id === 5).length;
            
            console.log(`📊 BATCH RESULTS:`);
            console.log(`   ✅ Successful: ${successful}/20`);
            console.log(`   ❌ Failed: ${failed}/20`);
            console.log(`   ⏰ Time Limit Exceeded: ${timeExceeded}/20`);
            
            if (successful > 0) {
                const avgCpuTime = batchResults
                    .filter(r => r.status?.id === 3)
                    .reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / successful;
                const maxCpuTime = Math.max(...batchResults
                    .filter(r => r.status?.id === 3)
                    .map(r => parseFloat(r.time || 0)));
                    
                console.log(`   ⏱️  Average CPU time per file: ${avgCpuTime.toFixed(3)}s`);
                console.log(`   ⏱️  Maximum CPU time per file: ${maxCpuTime.toFixed(3)}s`);
            }
            
            console.log(`   📈 Test cases processed: ${successful * testCaseCount}`);
            
            if (timeExceeded > 0) {
                console.log(`\n🚫 Hit limit at ${testCaseCount} test cases per file`);
                console.log(`\n🏆 OPTIMAL CONFIGURATION FOUND:`);
                console.log(`===================================`);
                console.log(`✅ Maximum test cases per file: ${testCaseCount - 1}`);
                console.log(`📊 Maximum batch capacity: ${20 * (testCaseCount - 1)} test cases`);
                console.log(`💰 Estimated cost for 40,000 test cases:`);
                console.log(`   📦 Batches needed: ${Math.ceil(40000 / (20 * (testCaseCount - 1)))}`);
                console.log(`   💵 API calls needed: ${Math.ceil(40000 / (20 * (testCaseCount - 1)))}`);
                console.log(`   🆓 Free tier covers: ${100 * 50} calls`);
                const batchesNeeded = Math.ceil(40000 / (20 * (testCaseCount - 1)));
                if (batchesNeeded <= 5000) {
                    console.log(`   ✅ Fully covered by free tier (${((batchesNeeded / 5000) * 100).toFixed(1)}% utilization)`);
                } else {
                    console.log(`   ❌ Exceeds free tier, will need paid plan`);
                }
                return;
            }
        }
        
        console.log('');
    }
}

async function testBatch(testCaseCount) {
    try {
        // Create 20 submissions with specified number of test cases each
        const submissions = [];
        
        for (let i = 0; i < 20; i++) {
            const code = generateBatchCode(testCaseCount);
            
            const submitResponse = await axios.post(
                `${JUDGE0_API_URL}/submissions`,
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

            submissions.push(submitResponse.data.token);
        }

        console.log(`📤 Submitted batch of 20 submissions...`);
        
        // Wait for completion
        const waitTime = Math.max(5, testCaseCount * 1.2 + 3); // Dynamic wait based on expected CPU time
        console.log(`⏳ Waiting ${waitTime}s for completion...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));

        // Collect results
        const results = [];
        for (const token of submissions) {
            const resultResponse = await axios.get(
                `${JUDGE0_API_URL}/submissions/${token}`,
                {
                    headers: {
                        'X-RapidAPI-Key': JUDGE0_API_KEY,
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                    }
                }
            );
            results.push(resultResponse.data);
        }

        return results;

    } catch (error) {
        console.error('❌ Batch test failed:', error.message);
        return null;
    }
}

function generateBatchCode(testCaseCount) {
    return `
#include <iostream>
using namespace std;

int main() {
    // Run ${testCaseCount} test cases, each taking ~1 second
    for (int test = 1; test <= ${testCaseCount}; test++) {
        // Simple O(n) algorithm: 10^8 operations = ~1 second  
        const int n = 100000000; // 10^8
        long long sum = 0;
        
        for (int i = 1; i <= n; i++) {
            sum += i; // Simple addition operation
        }
        
        cout << "Test " << test << " Sum: " << sum << endl;
    }
    
    return 0;
}`;
}

async function main() {
    console.log('🧮 Simple O(n) Algorithm Testing');
    console.log('=================================');
    console.log('Based on competitive programming standards:');
    console.log('10^8 operations = ~1 second of CPU time');
    console.log('');

    // First test single execution
    const singleResult = await testSingleExecution();
    
    if (singleResult && singleResult.status?.id === 3) {
        const cpuTime = parseFloat(singleResult.time || 0);
        console.log(`\n🎯 Single algorithm validation:`);
        console.log(`   Target: ~1.0 second`);
        console.log(`   Actual: ${cpuTime} seconds`);
        console.log(`   Accuracy: ${((1.0 / cpuTime) * 100).toFixed(1)}%`);
        
        if (cpuTime > 0.5 && cpuTime < 2.0) {
            console.log(`   ✅ Algorithm timing is acceptable for testing`);
            
            // Proceed with incremental batch testing
            await testIncrementalBatch();
        } else {
            console.log(`   ❌ Algorithm timing is too far off, need to adjust`);
        }
    } else {
        console.log(`\n❌ Single algorithm test failed, cannot proceed with batch testing`);
    }
}

// Run the test
main().catch(console.error); 