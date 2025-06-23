#!/usr/bin/env node

const axios = require('axios');

class BatchVsSingleTester {
    constructor() {
        this.apiKey = process.env.RAPIDAPI_KEY || process.env.JUDGE0_API_KEY;
        this.baseUrl = 'https://judge0-ce.p.rapidapi.com';
        
        if (!this.apiKey) {
            throw new Error('RAPIDAPI_KEY environment variable required');
        }
        
        console.log('🔍 Testing Single vs Batch Submission Time Limits');
        console.log('='.repeat(55));
    }

    // Generate simple fast code for batch testing
    generateFastCode(result) {
        return `#include <iostream>
using namespace std;
int main() {
    cout << "${result}" << endl;
    return 0;
}`;
    }

    // Generate code that takes specific time
    generateTimedCode(seconds) {
        return `#include <bits/stdc++.h>
using namespace std;
using namespace std::chrono;

int main() {
    auto start = high_resolution_clock::now();
    
    while (true) {
        auto now = high_resolution_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - start).count();
        if (elapsed >= ${seconds * 1000}) {
            break;
        }
        
        // Light computation
        for (int i = 0; i < 10000; i++) {
            volatile int x = i * i % 1000007;
        }
    }
    
    cout << "OK" << endl;
    return 0;
}`;
    }

    // Test single submission
    async testSingleSubmission(timeSeconds) {
        console.log(`\\n🧪 Testing single submission: ${timeSeconds}s`);
        
        const code = this.generateTimedCode(timeSeconds);
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
                {
                    source_code: code,
                    language_id: 54,
                    stdin: "",
                    cpu_time_limit: Math.min(timeSeconds + 5, 20),
                    memory_limit: 256000
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': this.apiKey
                    },
                    timeout: (timeSeconds + 15) * 1000
                }
            );
            
            const wallTime = (Date.now() - startTime) / 1000;
            const result = response.data;
            
            if (result.status.id === 3) {
                console.log(`   ✅ SUCCESS - Expected: ${timeSeconds}s, Actual: ${result.time}s, Wall: ${wallTime.toFixed(2)}s`);
                return { success: true, actualTime: result.time, wallTime, status: result.status.description };
            } else {
                console.log(`   ❌ FAILED - Status: ${result.status.description}, Wall: ${wallTime.toFixed(2)}s`);
                return { success: false, wallTime, status: result.status.description };
            }
        } catch (error) {
            const wallTime = (Date.now() - startTime) / 1000;
            console.log(`   ❌ ERROR - ${error.message}, Wall: ${wallTime.toFixed(2)}s`);
            return { success: false, wallTime, error: error.message };
        }
    }

    // Test batch submission
    async testBatchSubmission(batchSize, timePerSubmission = 0.1) {
        console.log(`\\n🧪 Testing batch submission: ${batchSize} submissions × ${timePerSubmission}s`);
        
        const submissions = Array.from({ length: batchSize }, (_, i) => ({
            source_code: this.generateFastCode(`Result${i + 1}`),
            language_id: 54,
            stdin: "",
            cpu_time_limit: 5,
            memory_limit: 256000
        }));
        
        const startTime = Date.now();
        
        try {
            const response = await axios.post(
                `${this.baseUrl}/submissions/batch?base64_encoded=false`,
                { submissions },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': this.apiKey
                    },
                    timeout: 60000
                }
            );
            
            // Get batch token
            const tokens = response.data.map(sub => sub.token);
            console.log(`   📝 Submitted batch with ${tokens.length} submissions`);
            
            // Wait for completion
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Get results
            const resultsResponse = await axios.get(
                `${this.baseUrl}/submissions/batch?tokens=${tokens.join(',')}&base64_encoded=false`,
                {
                    headers: {
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                        'X-RapidAPI-Key': this.apiKey
                    },
                    timeout: 30000
                }
            );
            
            const wallTime = (Date.now() - startTime) / 1000;
            const results = resultsResponse.data.submissions;
            const successCount = results.filter(r => r.status.id === 3).length;
            
            console.log(`   ✅ Batch completed - ${successCount}/${batchSize} successful, Wall: ${wallTime.toFixed(2)}s`);
            
            return {
                success: successCount === batchSize,
                successCount,
                totalSubmissions: batchSize,
                wallTime,
                results
            };
            
        } catch (error) {
            const wallTime = (Date.now() - startTime) / 1000;
            console.log(`   ❌ Batch ERROR - ${error.message}, Wall: ${wallTime.toFixed(2)}s`);
            return { success: false, wallTime, error: error.message };
        }
    }

    // Test different time limits to find exact boundary
    async findExactTimeLimit() {
        console.log('\\n📏 Finding Exact Single Submission Time Limit');
        console.log('='.repeat(50));
        
        const timeValues = [3, 4, 5, 6, 7, 8, 9];
        let maxSuccessfulTime = 0;
        
        for (const time of timeValues) {
            const result = await this.testSingleSubmission(time);
            
            if (result.success) {
                maxSuccessfulTime = time;
                console.log(`   ✅ ${time}s: PASSED`);
            } else {
                console.log(`   ❌ ${time}s: FAILED - Time limit found!`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        return maxSuccessfulTime;
    }

    // Test batch limits
    async testBatchLimits() {
        console.log('\\n📦 Testing Batch Submission Limits');
        console.log('='.repeat(40));
        
        const batchSizes = [5, 10, 15, 20];
        const results = [];
        
        for (const size of batchSizes) {
            const result = await this.testBatchSubmission(size);
            results.push({ size, ...result });
            
            if (result.success) {
                console.log(`   ✅ Batch size ${size}: SUCCESS`);
            } else {
                console.log(`   ❌ Batch size ${size}: FAILED`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        return results;
    }

    async runTests() {
        try {
            console.log('\\n🚀 Starting time limit discovery...');
            
            const singleTimeLimit = await this.findExactTimeLimit();
            
            console.log('\\n🎯 FINAL RESULTS');
            console.log('='.repeat(40));
            console.log(`📊 Maximum single submission time: ${singleTimeLimit}s`);
            
            // Calculate optimal batch strategy for LeetCode problems
            console.log('\\n🔧 LeetCode Problem Batch Strategy:');
            
            const strategies = [
                { type: 'Easy (0.5s per test)', maxCases: Math.floor(singleTimeLimit / 0.5) },
                { type: 'Medium (1s per test)', maxCases: Math.floor(singleTimeLimit / 1.0) },
                { type: 'Hard (2s per test)', maxCases: Math.floor(singleTimeLimit / 2.0) }
            ];
            
            strategies.forEach(strategy => {
                console.log(`   ${strategy.type}: ${strategy.maxCases} test cases per batch`);
            });
            
            return {
                singleTimeLimit,
                strategies
            };
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const tester = new BatchVsSingleTester();
    await tester.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = BatchVsSingleTester; 