#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class LeetCodeTimeLimitTester {
    constructor() {
        this.apiKey = process.env.JUDGE0_API_KEY;
        this.baseUrl = 'https://judge0-ce.p.rapidapi.com';
        
        if (!this.apiKey) {
            throw new Error('JUDGE0_API_KEY not found in environment variables');
        }
        
        this.headers = {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        };
        
        console.log('🚀 LeetCode Time Limit Tester Initialized');
        console.log(`📡 Base URL: ${this.baseUrl}`);
    }

    // Generate C++ code that simulates LeetCode problem execution
    generateLeetCodeSolution(timePerTestCase, testCaseCount) {
        return `
#include <iostream>
#include <chrono>
#include <vector>
#include <string>
using namespace std;
using namespace std::chrono;

// Simulate a LeetCode-style solution that takes exactly timePerTestCase seconds
void solve() {
    auto start = high_resolution_clock::now();
    
    // Simulate complex algorithm execution (e.g., dynamic programming, graph traversal)
    // This takes exactly ${timePerTestCase} seconds per test case
    while (true) {
        auto now = high_resolution_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - start).count();
        if (elapsed >= ${timePerTestCase * 1000}) {
            break;
        }
        
        // Light computation to avoid infinite loop detection
        for (int i = 0; i < 10000; i++) {
            volatile int x = i * i % 1000007;
        }
    }
    
    // Output result (simulating correct answer)
    cout << "42" << endl;
}

int main() {
    int t;
    cin >> t;
    
    for (int i = 0; i < t; i++) {
        solve();
    }
    
    return 0;
}`;
    }

    // Generate input for multiple test cases
    generateInput(testCaseCount) {
        return testCaseCount.toString() + '\n';
    }

    // Test single submission with multiple test cases (our current approach)
    async testMultiTestSubmission(testCases, timePerCase) {
        const totalExpectedTime = testCases * timePerCase;
        console.log(`\n🧪 Testing ${testCases} test cases × ${timePerCase}s = ${totalExpectedTime}s total`);
        
        try {
            const submission = {
                source_code: this.generateLeetCodeSolution(timePerCase, testCases),
                language_id: 54, // C++ (GCC 9.2.0)
                stdin: this.generateInput(testCases),
                cpu_time_limit: Math.min(totalExpectedTime + 5, 15), // Add buffer but respect max
                wall_time_limit: Math.min(totalExpectedTime + 10, 20) // Add buffer but respect max
            };
            
            const startTime = Date.now();
            const response = await axios.post(`${this.baseUrl}/submissions`, submission, { 
                headers: this.headers 
            });
            const token = response.data.token;
            
            // Wait for execution and get results
            let result = await this.pollForResult(token, totalExpectedTime + 30);
            const endTime = Date.now();
            const totalWallTime = (endTime - startTime) / 1000;
            
            const testResult = {
                testCases,
                timePerCase,
                totalExpectedTime,
                status: result.status.description,
                statusId: result.status.id,
                actualTime: parseFloat(result.time || 0),
                actualWallTime: parseFloat(result.wall_time || 0),
                totalWallTime,
                memory: result.memory,
                success: result.status.id === 3, // Accepted
                outputLines: result.stdout ? result.stdout.split('\n').length - 1 : 0,
                stderr: result.stderr?.substring(0, 200),
                token
            };
            
            if (testResult.success) {
                console.log(`✅ SUCCESS - ${testCases} test cases completed`);
                console.log(`   ⏱️  Expected: ${totalExpectedTime}s, Actual: ${testResult.actualTime}s`);
                console.log(`   🕒 Wall time: ${testResult.actualWallTime}s (Total: ${totalWallTime.toFixed(2)}s)`);
                console.log(`   📊 Output lines: ${testResult.outputLines}`);
            } else {
                console.log(`❌ FAILED - Status: ${testResult.status}`);
                console.log(`   ⏱️  Expected: ${totalExpectedTime}s, Actual: ${testResult.actualTime}s`);
                console.log(`   🕒 Wall time: ${testResult.actualWallTime}s`);
                if (testResult.stderr) {
                    console.log(`   🚨 Error: ${testResult.stderr}`);
                }
            }
            
            return testResult;
            
        } catch (error) {
            console.error(`❌ ERROR testing ${testCases} test cases:`, error.response?.data || error.message);
            return {
                testCases,
                timePerCase,
                totalExpectedTime,
                error: error.response?.data || error.message,
                success: false
            };
        }
    }

    // Test batch submissions with time constraints
    async testBatchSubmissions(batchSize, timePerCase) {
        console.log(`\n🔀 Testing ${batchSize} batch submissions × ${timePerCase}s each`);
        
        try {
            const submissions = [];
            for (let i = 0; i < batchSize; i++) {
                submissions.push({
                    source_code: this.generateLeetCodeSolution(timePerCase, 1),
                    language_id: 54,
                    stdin: this.generateInput(1),
                    cpu_time_limit: Math.min(timePerCase + 2, 15),
                    wall_time_limit: Math.min(timePerCase + 5, 20)
                });
            }
            
            const startTime = Date.now();
            const response = await axios.post(`${this.baseUrl}/submissions/batch`, 
                { submissions }, { headers: this.headers });
            
            const tokens = response.data.map(r => r.token).filter(t => t);
            console.log(`📦 Created ${tokens.length} batch submissions`);
            
            // Wait for all to complete
            const results = await Promise.all(
                tokens.map(token => this.pollForResult(token, timePerCase + 10))
            );
            
            const endTime = Date.now();
            const totalBatchTime = (endTime - startTime) / 1000;
            
            const statusCounts = {};
            let totalExecTime = 0;
            let totalWallTime = 0;
            let successCount = 0;
            
            results.forEach(result => {
                const status = result.status.description;
                statusCounts[status] = (statusCounts[status] || 0) + 1;
                totalExecTime += parseFloat(result.time || 0);
                totalWallTime += parseFloat(result.wall_time || 0);
                if (result.status.id === 3) successCount++;
            });
            
            const batchResult = {
                batchSize,
                timePerCase,
                totalExpectedTime: batchSize * timePerCase,
                statusCounts,
                successRate: successCount / batchSize,
                totalExecutionTime: totalExecTime,
                totalWallTime,
                batchWallTime: totalBatchTime,
                averageTimePerSubmission: totalExecTime / batchSize,
                efficiency: (batchSize * timePerCase) / totalBatchTime,
                success: successCount === batchSize
            };
            
            console.log(`📊 Success rate: ${(batchResult.successRate * 100).toFixed(1)}%`);
            console.log(`⏱️  Total execution: ${totalExecTime.toFixed(2)}s, Wall: ${totalWallTime.toFixed(2)}s`);
            console.log(`🕒 Batch wall time: ${totalBatchTime.toFixed(2)}s`);
            console.log(`🚀 Efficiency: ${batchResult.efficiency.toFixed(2)}x`);
            
            return batchResult;
            
        } catch (error) {
            console.error(`❌ ERROR testing batch:`, error.response?.data || error.message);
            return {
                batchSize,
                timePerCase,
                error: error.response?.data || error.message,
                success: false
            };
        }
    }

    // Poll for submission result with timeout
    async pollForResult(token, timeoutSeconds) {
        const maxAttempts = Math.ceil(timeoutSeconds / 2);
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            try {
                const response = await axios.get(`${this.baseUrl}/submissions/${token}`, {
                    headers: this.headers
                });
                
                const result = response.data;
                if (result.status.id > 2) { // Not in queue or processing
                    return result;
                }
                
                await this.sleep(2000);
                attempts++;
                
            } catch (error) {
                console.error(`Error polling result:`, error.response?.data || error.message);
                attempts++;
                await this.sleep(2000);
            }
        }
        
        // Timeout - try one more time
        try {
            const response = await axios.get(`${this.baseUrl}/submissions/${token}`, {
                headers: this.headers
            });
            return response.data;
        } catch (error) {
            return {
                status: { id: 13, description: 'Timeout' },
                time: null,
                wall_time: null,
                memory: null,
                stdout: null,
                stderr: 'Polling timeout'
            };
        }
    }

    // Test the maximum number of test cases per submission
    async findMaxTestCases() {
        console.log('\n🔍 Finding Maximum Test Cases Per Submission');
        console.log('=' .repeat(60));
        
        // Test with 1-second problems (LeetCode standard)
        const timePerCase = 1.0;
        const testCaseCounts = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
        
        const results = [];
        let maxSuccessful = 0;
        
        for (const testCases of testCaseCounts) {
            const result = await this.testMultiTestSubmission(testCases, timePerCase);
            results.push(result);
            
            if (result.success) {
                maxSuccessful = testCases;
            } else {
                console.log(`\n🛑 Found limit at ${testCases} test cases`);
                break;
            }
            
            // Wait between tests
            await this.sleep(3000);
        }
        
        return { maxSuccessful, results };
    }

    // Test different time constraints
    async testTimeConstraints() {
        console.log('\n⏱️  Testing Different Time Constraints');
        console.log('=' .repeat(60));
        
        const timeConstraints = [
            { testCases: 10, timePerCase: 0.5 },
            { testCases: 10, timePerCase: 1.0 },
            { testCases: 10, timePerCase: 1.5 },
            { testCases: 20, timePerCase: 0.5 },
            { testCases: 20, timePerCase: 1.0 },
            { testCases: 30, timePerCase: 0.5 },
            { testCases: 50, timePerCase: 0.3 }
        ];
        
        const results = [];
        
        for (const config of timeConstraints) {
            const result = await this.testMultiTestSubmission(config.testCases, config.timePerCase);
            results.push(result);
            await this.sleep(2000);
        }
        
        return results;
    }

    // Test batch vs multi-test efficiency
    async compareApproaches() {
        console.log('\n⚔️  Comparing Batch vs Multi-Test Approaches');
        console.log('=' .repeat(60));
        
        const testConfigs = [
            { testCases: 10, timePerCase: 1.0 },
            { testCases: 20, timePerCase: 1.0 },
            { testCases: 50, timePerCase: 0.5 }
        ];
        
        const comparisons = [];
        
        for (const config of testConfigs) {
            console.log(`\n📊 Comparing ${config.testCases} test cases × ${config.timePerCase}s each`);
            
            // Test multi-test approach
            const multiResult = await this.testMultiTestSubmission(config.testCases, config.timePerCase);
            await this.sleep(2000);
            
            // Test batch approach
            const batchResult = await this.testBatchSubmissions(config.testCases, config.timePerCase);
            await this.sleep(3000);
            
            const comparison = {
                config,
                multiTest: multiResult,
                batch: batchResult,
                multiTestFaster: multiResult.success && batchResult.success ? 
                    multiResult.totalWallTime < batchResult.batchWallTime : null,
                efficiencyGain: multiResult.success && batchResult.success ?
                    batchResult.batchWallTime / multiResult.totalWallTime : null
            };
            
            if (comparison.efficiencyGain) {
                console.log(`🚀 Multi-test is ${comparison.efficiencyGain.toFixed(2)}x faster`);
            }
            
            comparisons.push(comparison);
        }
        
        return comparisons;
    }

    // Sleep utility
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get Judge0 configuration
    async getConfig() {
        try {
            const response = await axios.get(`${this.baseUrl}/config_info`, { 
                headers: this.headers 
            });
            return response.data;
        } catch (error) {
            console.error('Error getting config:', error.response?.data || error.message);
            return null;
        }
    }

    // Run comprehensive test suite
    async runComprehensiveTests() {
        console.log('🎯 LeetCode Time Limit Comprehensive Testing Suite');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        // Get Judge0 configuration
        console.log('\n📋 Judge0 Configuration');
        const config = await this.getConfig();
        if (config) {
            console.log(`⏱️  CPU Time Limit: ${config.cpu_time_limit}s (max: ${config.max_cpu_time_limit}s)`);
            console.log(`🕒 Wall Time Limit: ${config.wall_time_limit}s (max: ${config.max_wall_time_limit}s)`);
            console.log(`💾 Memory Limit: ${config.memory_limit}KB (max: ${config.max_memory_limit}KB)`);
        }
        
        const results = {
            timestamp: new Date().toISOString(),
            judge0Config: config,
            maxTestCases: await this.findMaxTestCases(),
            timeConstraints: await this.testTimeConstraints(),
            approachComparison: await this.compareApproaches()
        };
        
        const endTime = Date.now();
        const totalTestTime = (endTime - startTime) / 1000;
        
        // Save results
        const filename = `leetcode-time-limits-${Date.now()}.json`;
        const filepath = path.join(__dirname, filename);
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        
        // Generate summary
        this.generateSummary(results, totalTestTime);
        
        console.log(`\n💾 Results saved to: ${filename}`);
        return results;
    }

    // Generate summary of findings
    generateSummary(results, totalTestTime) {
        console.log('\n📊 Test Results Summary');
        console.log('=' .repeat(60));
        
        // Max test cases findings
        const maxSuccessful = results.maxTestCases.maxSuccessful;
        console.log(`🎯 Maximum test cases per submission: ${maxSuccessful}`);
        
        // Optimal configurations
        const successfulConfigs = results.timeConstraints.filter(r => r.success);
        if (successfulConfigs.length > 0) {
            const maxTotal = Math.max(...successfulConfigs.map(r => r.totalExpectedTime));
            console.log(`⏱️  Maximum total execution time: ${maxTotal}s`);
        }
        
        // Approach comparison
        const validComparisons = results.approachComparison.filter(c => c.efficiencyGain);
        if (validComparisons.length > 0) {
            const avgEfficiency = validComparisons.reduce((sum, c) => sum + c.efficiencyGain, 0) / validComparisons.length;
            console.log(`🚀 Average multi-test efficiency gain: ${avgEfficiency.toFixed(2)}x`);
        }
        
        console.log(`🕒 Total test time: ${totalTestTime.toFixed(2)}s`);
        
        // Recommendations
        console.log('\n💡 Recommendations for LeetCode-style Problems:');
        console.log(`   📏 Max test cases per batch: ${Math.min(maxSuccessful, 50)}`);
        console.log(`   ⏱️  Time limit per test case: 1.0s (LeetCode standard)`);
        console.log(`   🔄 Use multi-test approach for ${validComparisons.length > 0 ? `${avgEfficiency.toFixed(1)}x` : 'better'} efficiency`);
        
        return {
            maxTestCases: maxSuccessful,
            maxTotalTime: successfulConfigs.length > 0 ? Math.max(...successfulConfigs.map(r => r.totalExpectedTime)) : 0,
            averageEfficiencyGain: validComparisons.length > 0 ? validComparisons.reduce((sum, c) => sum + c.efficiencyGain, 0) / validComparisons.length : 1
        };
    }
}

// Main execution
async function main() {
    try {
        const tester = new LeetCodeTimeLimitTester();
        await tester.runComprehensiveTests();
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Export for use as module
module.exports = LeetCodeTimeLimitTester;

// Run if called directly
if (require.main === module) {
    main();
} 