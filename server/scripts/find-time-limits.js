#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

class TimeLimitFinder {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY || process.env.JUDGE0_API_KEY;
        this.baseUrl = 'https://judge0-ce.p.rapidapi.com';
        
        if (!this.apiKey) {
            throw new Error('RAPIDAPI_KEY or JUDGE0_API_KEY environment variable required');
        }
        
        console.log('🎯 Finding Judge0 Time Limits for LeetCode-style Problems');
        console.log('='.repeat(60));
    }

    // Generate C++ code that takes exactly the specified time per test case
    generateTimedCode(secondsPerTestCase, testCaseCount) {
        return `#include <bits/stdc++.h>
using namespace std;
using namespace std::chrono;

void solve() {
    auto start = high_resolution_clock::now();
    
    // Simulate LeetCode problem execution for exactly ${secondsPerTestCase} seconds
    while (true) {
        auto now = high_resolution_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - start).count();
        if (elapsed >= ${secondsPerTestCase * 1000}) {
            break;
        }
        
        // Light computation to avoid infinite loop detection
        for (int i = 0; i < 50000; i++) {
            volatile int x = i * i % 1000007;
        }
    }
    
    cout << "OK" << endl;
}

int main() {
    int T;
    cin >> T;
    while (T--) {
        solve();
    }
    return 0;
}`;
    }

    // Execute with Judge0 and wait for result
    async executeWithJudge0(code, input, timeoutSeconds = 60) {
        const submissionRequest = {
            source_code: code,
            language_id: 54, // C++ (GCC 9.2.0)
            stdin: input,
            cpu_time_limit: Math.min(timeoutSeconds, 20), // Respect Judge0 limits
            memory_limit: 256000
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
                submissionRequest,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': this.apiKey
                    },
                    timeout: (timeoutSeconds + 10) * 1000
                }
            );

            return response.data;
        } catch (error) {
            return {
                status: { id: -1, description: 'REQUEST_ERROR' },
                error: error.response?.data || error.message
            };
        }
    }

    // Test a specific configuration
    async testConfiguration(testCases, timePerCase) {
        const totalTime = testCases * timePerCase;
        console.log(`\n🧪 Testing: ${testCases} test cases × ${timePerCase}s = ${totalTime}s total`);
        
        const code = this.generateTimedCode(timePerCase, testCases);
        const input = testCases.toString();
        
        const startTime = Date.now();
        const result = await this.executeWithJudge0(code, input, totalTime + 30);
        const endTime = Date.now();
        const wallTime = (endTime - startTime) / 1000;
        
        const testResult = {
            testCases,
            timePerCase,
            totalExpectedTime: totalTime,
            status: result.status.description,
            statusId: result.status.id,
            actualTime: parseFloat(result.time || 0),
            wallTime,
            memory: result.memory,
            success: result.status.id === 3,
            outputLines: result.stdout ? result.stdout.split('\n').length - 1 : 0,
            error: result.error
        };
        
        if (testResult.success) {
            console.log(`✅ SUCCESS - Expected: ${totalTime}s, Actual: ${testResult.actualTime}s, Wall: ${wallTime.toFixed(2)}s`);
            console.log(`   📊 Output lines: ${testResult.outputLines}, Memory: ${testResult.memory}KB`);
        } else {
            console.log(`❌ FAILED - Status: ${testResult.status}`);
            console.log(`   ⏱️  Expected: ${totalTime}s, Wall time: ${wallTime.toFixed(2)}s`);
            if (testResult.error) {
                console.log(`   🚨 Error:`, testResult.error);
            }
        }
        
        return testResult;
    }

    // Find maximum number of 1-second test cases
    async findMax1SecondTestCases() {
        console.log('\n🎯 Finding Maximum 1-Second Test Cases');
        console.log('='.repeat(50));
        
        const testCaseCounts = [5, 10, 15, 20, 25, 30];
        const results = [];
        let maxSuccessful = 0;
        
        for (const testCases of testCaseCounts) {
            const result = await this.testConfiguration(testCases, 1.0);
            results.push(result);
            
            if (result.success) {
                maxSuccessful = testCases;
                console.log(`   ✅ ${testCases} test cases: PASSED`);
            } else {
                console.log(`   ❌ ${testCases} test cases: FAILED - Found limit!`);
                break;
            }
            
            // Wait between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return { maxSuccessful, results };
    }

    // Find optimal batch sizes for different time constraints
    async findOptimalBatchSizes() {
        console.log('\n🔧 Finding Optimal Batch Sizes for Different Problems');
        console.log('='.repeat(60));
        
        // LeetCode-style problem difficulties
        const problemTypes = [
            { name: 'Easy', timePerCase: 0.5, description: 'Simple problems (array, string)' },
            { name: 'Medium', timePerCase: 1.0, description: 'Standard LeetCode problems' },
            { name: 'Hard', timePerCase: 2.0, description: 'Complex algorithms' },
        ];
        
        const batchSizes = [10, 20, 30];
        const recommendations = [];
        
        for (const problem of problemTypes) {
            console.log(`\n📋 ${problem.name} Problems (${problem.timePerCase}s per test case)`);
            console.log(`   ${problem.description}`);
            
            let maxBatchSize = 0;
            const problemResults = [];
            
            for (const batchSize of batchSizes) {
                const totalTime = batchSize * problem.timePerCase;
                
                // Skip if clearly over limits
                if (totalTime > 20) {
                    console.log(`   ⏭️  Skipping ${batchSize} cases (${totalTime}s > 20s limit)`);
                    continue;
                }
                
                const result = await this.testConfiguration(batchSize, problem.timePerCase);
                problemResults.push(result);
                
                if (result.success) {
                    maxBatchSize = batchSize;
                    console.log(`   ✅ ${batchSize} cases (${totalTime}s): SUCCESS`);
                } else {
                    console.log(`   ❌ ${batchSize} cases (${totalTime}s): FAILED`);
                    break;
                }
                
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            recommendations.push({
                problemType: problem.name,
                timePerCase: problem.timePerCase,
                maxBatchSize,
                maxTotalTime: maxBatchSize * problem.timePerCase,
                results: problemResults
            });
            
            console.log(`   🎯 Recommendation: Max ${maxBatchSize} test cases per batch`);
        }
        
        return recommendations;
    }

    // Run comprehensive testing
    async runTests() {
        try {
            console.log('\n🚀 Starting comprehensive time limit testing...');
            
            const results = {
                timestamp: new Date().toISOString(),
                max1Second: await this.findMax1SecondTestCases(),
                optimalBatches: await this.findOptimalBatchSizes()
            };
            
            // Save raw results
            const filename = `time-limits-${Date.now()}.json`;
            fs.writeFileSync(filename, JSON.stringify(results, null, 2));
            console.log(`\n💾 Raw results saved to: ${filename}`);
            
            // Generate recommendations
            console.log('\n🎯 FINAL RECOMMENDATIONS');
            console.log('='.repeat(60));
            
            console.log(`📊 Maximum 1-second test cases: ${results.max1Second.maxSuccessful}`);
            
            console.log('\n📋 Batch Size Recommendations:');
            results.optimalBatches.forEach(rec => {
                console.log(`   ${rec.problemType}: ${rec.maxBatchSize} test cases (${rec.timePerCase}s each)`);
            });
            
            return results;
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const finder = new TimeLimitFinder();
    await finder.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TimeLimitFinder; 