const axios = require('axios');

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

// Based on our findings: 2B operations = ~1 second
const OPERATIONS_PER_TEST = 2000000000;

function generateBatchCode(testCaseCount) {
    return `
#include <iostream>
using namespace std;

int main() {
    // Process ${testCaseCount} test cases, each taking ~1 second
    for (int test = 1; test <= ${testCaseCount}; test++) {
        const int n = ${OPERATIONS_PER_TEST};
        long long sum = 0;
        
        for (int i = 1; i <= n; i++) {
            sum += i;
        }
        
        cout << "Test " << test << " Sum: " << sum << endl;
    }
    
    return 0;
}`;
}

async function testBatchSize(testCaseCount) {
    console.log(`\n🧪 TESTING: ${testCaseCount} test cases per source file`);
    console.log(`📊 Expected: 20 files × ${testCaseCount} test cases = ${20 * testCaseCount} total test cases`);
    console.log(`⏱️  Expected CPU time per file: ${testCaseCount * 1.022}s`);
    
    if (testCaseCount * 1.022 > 15) {
        console.log('⚠️  Expected to exceed 15s CPU limit');
    }
    
    try {
        // Create batch of 20 submissions
        const submissions = [];
        const code = generateBatchCode(testCaseCount);
        
        console.log('📤 Submitting batch of 20 files...');
        
        for (let i = 0; i < 20; i++) {
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
            
            submissions.push(submitResponse.data.token);
            
            // Small delay between submissions to avoid rate limiting
            if (i < 19) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log(`✅ All 20 submissions created`);
        
        // Wait for completion with dynamic timing
        const expectedTime = testCaseCount * 1.022;
        const waitTime = Math.max(10, expectedTime + 5);
        console.log(`⏳ Waiting ${waitTime}s for completion...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        
        // Collect results
        console.log('📥 Collecting results...');
        const results = [];
        
        for (let i = 0; i < submissions.length; i++) {
            try {
                const resultResponse = await axios.get(
                    `${JUDGE0_API_URL}/submissions/${submissions[i]}?base64_encoded=true`,
                    {
                        headers: {
                            'X-RapidAPI-Key': JUDGE0_API_KEY,
                            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                        }
                    }
                );
                results.push(resultResponse.data);
            } catch (error) {
                console.error(`   ❌ Failed to get result for submission ${i + 1}`);
                results.push({ status: { id: 0, description: 'Request Failed' } });
            }
            
            // Small delay between result fetches
            if (i < submissions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // Analyze results
        const successful = results.filter(r => r.status?.id === 3).length;
        const failed = results.filter(r => r.status?.id !== 3).length;
        const timeExceeded = results.filter(r => r.status?.id === 5).length;
        const processing = results.filter(r => r.status?.id === 2).length;
        const other = results.filter(r => r.status?.id !== 3 && r.status?.id !== 5 && r.status?.id !== 2).length;
        
        console.log(`\n📊 BATCH RESULTS:`);
        console.log(`   ✅ Successful: ${successful}/20`);
        console.log(`   ❌ Failed: ${failed}/20`);
        console.log(`   ⏰ Time Limit Exceeded: ${timeExceeded}/20`);
        console.log(`   🔄 Still Processing: ${processing}/20`);
        console.log(`   ❓ Other Status: ${other}/20`);
        
        if (successful > 0) {
            const successfulResults = results.filter(r => r.status?.id === 3);
            const avgCpuTime = successfulResults.reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / successful;
            const maxCpuTime = Math.max(...successfulResults.map(r => parseFloat(r.time || 0)));
            const minCpuTime = Math.min(...successfulResults.map(r => parseFloat(r.time || 0)));
            
            console.log(`   ⏱️  Average CPU time: ${avgCpuTime.toFixed(3)}s`);
            console.log(`   ⏱️  Max CPU time: ${maxCpuTime.toFixed(3)}s`);
            console.log(`   ⏱️  Min CPU time: ${minCpuTime.toFixed(3)}s`);
        }
        
        console.log(`   📈 Test cases processed: ${successful * testCaseCount}`);
        
        // Determine viability
        const viabilityThreshold = 18; // At least 90% success rate
        const isViable = successful >= viabilityThreshold;
        
        console.log(`\n🎯 VIABILITY:`);
        if (isViable) {
            console.log(`   ✅ VIABLE: ${successful}/20 successful (≥90%)`);
        } else {
            console.log(`   ❌ NOT VIABLE: ${successful}/20 successful (<90%)`);
        }
        
        // Show detailed status breakdown for failures
        if (failed > 0) {
            console.log(`\n🔍 Failure Details:`);
            const statusCounts = {};
            results.forEach(r => {
                const status = r.status?.description || 'Unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`   ${status}: ${count}`);
            });
        }
        
        return {
            testCaseCount,
            successful,
            failed,
            timeExceeded,
            processing,
            isViable,
            avgCpuTime: successful > 0 ? results.filter(r => r.status?.id === 3).reduce((sum, r) => sum + parseFloat(r.time || 0), 0) / successful : 0
        };
        
    } catch (error) {
        console.error(`❌ Batch test failed: ${error.message}`);
        return {
            testCaseCount,
            successful: 0,
            failed: 20,
            timeExceeded: 0,
            processing: 0,
            isViable: false,
            avgCpuTime: 0
        };
    }
}

async function progressiveBatchTest() {
    console.log('🚀 PROGRESSIVE BATCH SIZE TESTING');
    console.log('=================================');
    console.log('Finding the maximum number of test cases per source file');
    console.log(`Using calibrated algorithm: ${OPERATIONS_PER_TEST.toLocaleString()} operations = ~1.022s per test case\n`);
    
    const results = [];
    let maxViableTestCases = 0;
    
    // Test from 1 to 10 test cases per file
    // Start low to avoid rate limiting and find exact breaking point
    for (let testCases = 1; testCases <= 10; testCases++) {
        const result = await testBatchSize(testCases);
        results.push(result);
        
        if (result.isViable) {
            maxViableTestCases = testCases;
        } else if (maxViableTestCases > 0) {
            // Found the breaking point
            break;
        }
        
        // Rate limiting delay between tests
        if (testCases < 10) {
            console.log(`⏸️  Waiting 15 seconds before next test...`);
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
    
    // Summary
    console.log(`\n🏆 PROGRESSIVE TESTING RESULTS:`);
    console.log('===============================');
    
    results.forEach(result => {
        const status = result.isViable ? '✅ VIABLE' : '❌ NOT VIABLE';
        console.log(`${result.testCaseCount} test cases: ${status} (${result.successful}/20 successful, avg: ${result.avgCpuTime.toFixed(3)}s)`);
    });
    
    console.log(`\n🎯 OPTIMAL CONFIGURATION:`);
    console.log(`=============================`);
    console.log(`✅ Maximum test cases per file: ${maxViableTestCases}`);
    console.log(`📊 Maximum batch capacity: ${20 * maxViableTestCases} test cases`);
    console.log(`⏱️  CPU time per file: ~${maxViableTestCases * 1.022}s`);
    
    if (maxViableTestCases > 0) {
        const batchCapacity = 20 * maxViableTestCases;
        const batchesFor40k = Math.ceil(40000 / batchCapacity);
        
        console.log(`\n💰 COST ANALYSIS FOR 40,000 TEST CASES:`);
        console.log(`======================================`);
        console.log(`📦 Batches needed: ${batchesFor40k}`);
        console.log(`🆓 Free tier available: 5,000 calls`);
        console.log(`📈 Utilization: ${((batchesFor40k / 5000) * 100).toFixed(1)}%`);
        console.log(`💵 Cost: $0.00 (fully covered by free tier)`);
        
        const avgTimePerBatch = (maxViableTestCases * 1.022) + 5; // +5s overhead
        const totalTime = batchesFor40k * avgTimePerBatch;
        console.log(`⏱️  Total execution time: ${(totalTime / 60).toFixed(1)} minutes`);
    } else {
        console.log(`\n❌ No viable configuration found`);
    }
}

// Run the progressive test
progressiveBatchTest().catch(console.error); 