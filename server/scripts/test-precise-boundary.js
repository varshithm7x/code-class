#!/usr/bin/env node

const axios = require('axios');

class PreciseBoundaryTester {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY || process.env.JUDGE0_API_KEY;
        this.baseUrl = 'https://judge0-ce.p.rapidapi.com';
        
        if (!this.apiKey) {
            throw new Error('RAPIDAPI_KEY environment variable required');
        }
        
        console.log('🎯 Precise Time Limit Boundary Testing');
        console.log('='.repeat(45));
    }

    // Multi-test case code (like our real implementation)
    generateMultiTestCode(testCases, timePerCase) {
        return `#include <bits/stdc++.h>
using namespace std;
using namespace std::chrono;

void solve() {
    auto start = high_resolution_clock::now();
    
    // Simulate exactly ${timePerCase} seconds per test case
    while (true) {
        auto now = high_resolution_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - start).count();
        if (elapsed >= ${timePerCase * 1000}) {
            break;
        }
        
        // Light computation to simulate real problem solving
        for (int i = 0; i < 25000; i++) {
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

    // Test multi-test configuration (our real use case)
    async testMultiTestConfig(testCases, timePerCase) {
        const totalTime = testCases * timePerCase;
        console.log(`\\n🧪 Testing: ${testCases} test cases × ${timePerCase}s = ${totalTime}s total`);
        
        const code = this.generateMultiTestCode(testCases, timePerCase);
        const input = testCases.toString();
        
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
                {
                    source_code: code,
                    language_id: 54,
                    stdin: input,
                    cpu_time_limit: Math.min(totalTime + 5, 20),
                    memory_limit: 256000
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': this.apiKey
                    },
                    timeout: (totalTime + 15) * 1000
                }
            );
            
            const wallTime = (Date.now() - startTime) / 1000;
            const result = response.data;
            
            if (result.status.id === 3) {
                const outputLines = result.stdout ? result.stdout.split('\\n').length - 1 : 0;
                console.log(`   ✅ SUCCESS - Expected: ${totalTime}s, Actual: ${result.time}s, Wall: ${wallTime.toFixed(2)}s`);
                console.log(`   📊 Output lines: ${outputLines}/${testCases}, Memory: ${result.memory}KB`);
                return { success: true, actualTime: result.time, wallTime, outputLines, testCases };
            } else {
                console.log(`   ❌ FAILED - Status: ${result.status.description}, Wall: ${wallTime.toFixed(2)}s`);
                return { success: false, wallTime, status: result.status.description };
            }
        } catch (error) {
            const wallTime = (Date.now() - startTime) / 1000
            console.log(`   ❌ ERROR - ${error.message}, Wall: ${wallTime.toFixed(2)}s`);
            return { success: false, wallTime, error: error.message };
        }
    }

    // Test precise boundary around problematic area
    async findPreciseBoundary() {
        console.log('\\n📏 Testing Multi-Test Cases (Our Real Use Case)');
        console.log('='.repeat(50));
        
        // Test configurations that match our real LeetCode scenarios
        const testConfigs = [
            { testCases: 5, timePerCase: 1.0 },   // 5s - should pass
            { testCases: 6, timePerCase: 1.0 },   // 6s
            { testCases: 7, timePerCase: 1.0 },   // 7s  
            { testCases: 8, timePerCase: 1.0 },   // 8s
            { testCases: 9, timePerCase: 1.0 },   // 9s
            { testCases: 10, timePerCase: 1.0 },  // 10s - failed before
        ];
        
        const results = [];
        let maxSuccessfulTotal = 0;
        let maxSuccessfulTestCases1s = 0;
        
        for (const config of testConfigs) {
            const result = await this.testMultiTestConfig(config.testCases, config.timePerCase);
            results.push({ ...config, ...result });
            
            if (result.success) {
                const totalTime = config.testCases * config.timePerCase;
                maxSuccessfulTotal = Math.max(maxSuccessfulTotal, totalTime);
                
                if (config.timePerCase === 1.0) {
                    maxSuccessfulTestCases1s = Math.max(maxSuccessfulTestCases1s, config.testCases);
                }
                
                console.log(`   ✅ ${config.testCases}×${config.timePerCase}s = ${totalTime}s: PASSED`);
            } else {
                const totalTime = config.testCases * config.timePerCase;
                console.log(`   ❌ ${config.testCases}×${config.timePerCase}s = ${totalTime}s: FAILED`);
            }
            
            // Wait between tests to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return { results, maxSuccessfulTotal, maxSuccessfulTestCases1s };
    }

    async runTests() {
        try {
            console.log('\\n🚀 Starting precise boundary testing...');
            
            const boundaryResults = await this.findPreciseBoundary();
            
            console.log('\\n🎯 PRECISE RESULTS');
            console.log('='.repeat(45));
            console.log(`📊 Maximum total execution time: ${boundaryResults.maxSuccessfulTotal}s`);
            console.log(`📊 Maximum 1-second test cases: ${boundaryResults.maxSuccessfulTestCases1s}`);
            
            // Generate final batch strategy based on actual findings
            console.log('\\n🔧 OPTIMIZED BATCH STRATEGY FOR LEETCODE');
            console.log('='.repeat(45));
            
            const strategies = [
                { 
                    type: 'Easy Problems (0.5s)', 
                    maxCases: Math.floor(boundaryResults.maxSuccessfulTotal / 0.5),
                    safeMaxCases: Math.floor(boundaryResults.maxSuccessfulTotal * 0.8 / 0.5) // 80% safety margin
                },
                { 
                    type: 'Medium Problems (1.0s)', 
                    maxCases: boundaryResults.maxSuccessfulTestCases1s,
                    safeMaxCases: Math.floor(boundaryResults.maxSuccessfulTestCases1s * 0.8) // 80% safety margin
                },
                { 
                    type: 'Hard Problems (2.0s)', 
                    maxCases: Math.floor(boundaryResults.maxSuccessfulTotal / 2.0),
                    safeMaxCases: Math.floor(boundaryResults.maxSuccessfulTotal * 0.8 / 2.0) // 80% safety margin
                }
            ];
            
            strategies.forEach(strategy => {
                console.log(`   ${strategy.type}:`);
                console.log(`      Maximum: ${strategy.maxCases} test cases per batch`);
                console.log(`      Safe (80%): ${strategy.safeMaxCases} test cases per batch`);
            });
            
            console.log('\\n💡 RECOMMENDATIONS:');
            console.log(`   • Use safe limits for production (80% of maximum)`);
            console.log(`   • Easy problems: ${strategies[0].safeMaxCases} test cases per batch`);
            console.log(`   • Medium problems: ${strategies[1].safeMaxCases} test cases per batch`);
            console.log(`   • Hard problems: ${strategies[2].safeMaxCases} test cases per batch`);
            
            return {
                ...boundaryResults,
                strategies,
                recommendations: {
                    easy: strategies[0].safeMaxCases,
                    medium: strategies[1].safeMaxCases,
                    hard: strategies[2].safeMaxCases,
                    maxTotalTime: boundaryResults.maxSuccessfulTotal
                }
            };
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const tester = new PreciseBoundaryTester();
    const results = await tester.runTests();
    
    // Save results for algorithm implementation
    const fs = require('fs');
    fs.writeFileSync(`precise-boundary-results-${Date.now()}.json`, JSON.stringify(results, null, 2));
    console.log('\\n💾 Results saved for batch division algorithm implementation');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PreciseBoundaryTester; 