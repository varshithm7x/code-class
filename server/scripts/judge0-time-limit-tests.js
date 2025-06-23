#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Configuration
const JUDGE0_API_URL = process.env.JUDGE0_API_URL || 'https://api.judge0.com';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

if (!JUDGE0_API_KEY) {
    console.error('Error: JUDGE0_API_KEY environment variable is required');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': JUDGE0_API_KEY,
    'X-RapidAPI-Host': 'api.judge0.com'
};

// C++ code that runs for a specific duration with multiple test cases
function generateTimedCode(durationSeconds, testCaseCount) {
    return `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;
using namespace std::chrono;

void solve() {
    auto start = high_resolution_clock::now();
    
    // Simulate processing for ${durationSeconds} seconds per test case
    while (true) {
        auto now = high_resolution_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - start).count();
        if (elapsed >= ${durationSeconds * 1000}) {
            break;
        }
        // Light computation to avoid being killed for infinite loop
        for (int i = 0; i < 1000; i++) {
            volatile int x = i * i;
        }
    }
    
    cout << "Test case completed in " << ${durationSeconds} << " seconds" << endl;
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

// Generate input with multiple test cases
function generateInput(testCaseCount) {
    return testCaseCount.toString() + '\n';
}

// Test single submission with varying execution times
async function testSingleSubmissionLimits() {
    console.log('\n=== Testing Single Submission Time Limits ===');
    
    const timeTests = [0.5, 1, 2, 5, 10, 15, 20, 30];
    const results = [];
    
    for (const timeLimit of timeTests) {
        console.log(`\nTesting single submission with ${timeLimit}s execution time...`);
        
        try {
            const submission = {
                source_code: generateTimedCode(timeLimit, 1),
                language_id: 54, // C++ (GCC 9.2.0)
                stdin: generateInput(1),
                cpu_time_limit: 60, // Set high to test wall time limits
                wall_time_limit: 150 // Maximum allowed
            };
            
            const response = await axios.post(`${JUDGE0_API_URL}/submissions`, submission, { headers });
            const token = response.data.token;
            
            // Wait and get results
            await new Promise(resolve => setTimeout(resolve, 2000));
            let result = await getSubmissionResult(token);
            
            // Wait longer if still processing
            let attempts = 0;
            while ((result.status.id === 1 || result.status.id === 2) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                result = await getSubmissionResult(token);
                attempts++;
            }
            
            results.push({
                expectedTime: timeLimit,
                status: result.status.description,
                statusId: result.status.id,
                actualTime: result.time,
                wallTime: result.wall_time,
                memory: result.memory,
                stdout: result.stdout?.substring(0, 100),
                stderr: result.stderr?.substring(0, 100)
            });
            
            console.log(`Status: ${result.status.description} (ID: ${result.status.id})`);
            console.log(`Execution time: ${result.time}s, Wall time: ${result.wall_time}s`);
            
        } catch (error) {
            console.error(`Error testing ${timeLimit}s:`, error.response?.data || error.message);
            results.push({
                expectedTime: timeLimit,
                status: 'ERROR',
                error: error.response?.data || error.message
            });
        }
    }
    
    return results;
}

// Test batch submissions with varying numbers of test cases
async function testBatchLimits() {
    console.log('\n=== Testing Batch Submission Limits ===');
    
    // Test different batch sizes with different execution times per case
    const testConfigs = [
        { batchSize: 5, timePerCase: 0.2, description: '5 submissions × 0.2s each = 1s total' },
        { batchSize: 10, timePerCase: 0.5, description: '10 submissions × 0.5s each = 5s total' },
        { batchSize: 20, timePerCase: 0.5, description: '20 submissions × 0.5s each = 10s total' },
        { batchSize: 20, timePerCase: 1.0, description: '20 submissions × 1s each = 20s total' },
        { batchSize: 20, timePerCase: 2.0, description: '20 submissions × 2s each = 40s total' },
        { batchSize: 20, timePerCase: 5.0, description: '20 submissions × 5s each = 100s total' },
        { batchSize: 20, timePerCase: 10.0, description: '20 submissions × 10s each = 200s total' }
    ];
    
    const results = [];
    
    for (const config of testConfigs) {
        console.log(`\nTesting: ${config.description}`);
        
        try {
            // Create batch submissions
            const submissions = [];
            for (let i = 0; i < config.batchSize; i++) {
                submissions.push({
                    source_code: generateTimedCode(config.timePerCase, 1),
                    language_id: 54, // C++ (GCC 9.2.0)
                    stdin: generateInput(1),
                    cpu_time_limit: 60,
                    wall_time_limit: 150
                });
            }
            
            const batchStart = Date.now();
            const response = await axios.post(`${JUDGE0_API_URL}/submissions/batch`, 
                { submissions }, { headers });
            
            const tokens = response.data.map(r => r.token).filter(t => t);
            console.log(`Created ${tokens.length} submissions successfully`);
            
            // Wait for all to complete
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const batchResults = await Promise.all(
                tokens.map(token => getSubmissionResult(token))
            );
            
            const batchEnd = Date.now();
            const totalBatchTime = (batchEnd - batchStart) / 1000;
            
            const statusCounts = {};
            let totalExecutionTime = 0;
            let totalWallTime = 0;
            
            batchResults.forEach(result => {
                const status = result.status.description;
                statusCounts[status] = (statusCounts[status] || 0) + 1;
                totalExecutionTime += parseFloat(result.time || 0);
                totalWallTime += parseFloat(result.wall_time || 0);
            });
            
            const resultSummary = {
                config,
                batchSize: config.batchSize,
                expectedTimePerCase: config.timePerCase,
                expectedTotalTime: config.batchSize * config.timePerCase,
                actualTotalExecutionTime: totalExecutionTime,
                actualTotalWallTime: totalWallTime,
                actualBatchWallTime: totalBatchTime,
                statusCounts,
                successRate: (statusCounts['Accepted'] || 0) / config.batchSize,
                sampleResults: batchResults.slice(0, 3) // First 3 for inspection
            };
            
            console.log(`Status distribution:`, statusCounts);
            console.log(`Success rate: ${(resultSummary.successRate * 100).toFixed(1)}%`);
            console.log(`Total execution time: ${totalExecutionTime.toFixed(2)}s`);
            console.log(`Total wall time: ${totalWallTime.toFixed(2)}s`);
            console.log(`Batch wall time: ${totalBatchTime.toFixed(2)}s`);
            
            results.push(resultSummary);
            
        } catch (error) {
            console.error(`Error testing batch config:`, error.response?.data || error.message);
            results.push({
                config,
                error: error.response?.data || error.message
            });
        }
    }
    
    return results;
}

// Test multi-test case submissions (our current approach)
async function testMultiTestCaseLimits() {
    console.log('\n=== Testing Multi-Test Case Submissions ===');
    
    const testConfigs = [
        { testCases: 5, timePerCase: 0.2, description: '5 test cases × 0.2s each = 1s total' },
        { testCases: 10, timePerCase: 0.5, description: '10 test cases × 0.5s each = 5s total' },
        { testCases: 25, timePerCase: 0.4, description: '25 test cases × 0.4s each = 10s total' },
        { testCases: 50, timePerCase: 0.4, description: '50 test cases × 0.4s each = 20s total' },
        { testCases: 100, timePerCase: 0.3, description: '100 test cases × 0.3s each = 30s total' },
        { testCases: 200, timePerCase: 0.25, description: '200 test cases × 0.25s each = 50s total' },
        { testCases: 500, timePerCase: 0.2, description: '500 test cases × 0.2s each = 100s total' }
    ];
    
    const results = [];
    
    for (const config of testConfigs) {
        console.log(`\nTesting: ${config.description}`);
        
        try {
            const submission = {
                source_code: generateTimedCode(config.timePerCase, config.testCases),
                language_id: 54, // C++ (GCC 9.2.0)
                stdin: generateInput(config.testCases),
                cpu_time_limit: 60,
                wall_time_limit: 150
            };
            
            const start = Date.now();
            const response = await axios.post(`${JUDGE0_API_URL}/submissions`, submission, { headers });
            const token = response.data.token;
            
            // Wait and get results
            await new Promise(resolve => setTimeout(resolve, 5000));
            let result = await getSubmissionResult(token);
            
            // Wait longer if still processing
            let attempts = 0;
            while ((result.status.id === 1 || result.status.id === 2) && attempts < 60) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                result = await getSubmissionResult(token);
                attempts++;
            }
            
            const end = Date.now();
            const wallTimeTotal = (end - start) / 1000;
            
            const resultSummary = {
                config,
                status: result.status.description,
                statusId: result.status.id,
                actualTime: result.time,
                actualWallTime: result.wall_time,
                totalWallTime: wallTimeTotal,
                memory: result.memory,
                successRate: result.status.id === 3 ? 1 : 0,
                outputLines: result.stdout ? result.stdout.split('\n').length - 1 : 0
            };
            
            console.log(`Status: ${result.status.description} (ID: ${result.status.id})`);
            console.log(`Execution time: ${result.time}s, Wall time: ${result.wall_time}s`);
            console.log(`Total wall time: ${wallTimeTotal.toFixed(2)}s`);
            console.log(`Output lines: ${resultSummary.outputLines}`);
            
            results.push(resultSummary);
            
        } catch (error) {
            console.error(`Error testing multi-test config:`, error.response?.data || error.message);
            results.push({
                config,
                error: error.response?.data || error.message
            });
        }
    }
    
    return results;
}

async function getSubmissionResult(token) {
    const response = await axios.get(`${JUDGE0_API_URL}/submissions/${token}`, { headers });
    return response.data;
}

// Get Judge0 configuration
async function getJudge0Config() {
    try {
        const response = await axios.get(`${JUDGE0_API_URL}/config_info`, { headers });
        return response.data;
    } catch (error) {
        console.error('Error getting config:', error.response?.data || error.message);
        return null;
    }
}

// Main test execution
async function runAllTests() {
    console.log('Judge0 Time Limit Testing Suite');
    console.log('===============================');
    
    // Get current configuration
    console.log('\n=== Judge0 Configuration ===');
    const config = await getJudge0Config();
    if (config) {
        console.log(`CPU Time Limit: ${config.cpu_time_limit}s (max: ${config.max_cpu_time_limit}s)`);
        console.log(`Wall Time Limit: ${config.wall_time_limit}s (max: ${config.max_wall_time_limit}s)`);
        console.log(`Memory Limit: ${config.memory_limit}KB (max: ${config.max_memory_limit}KB)`);
        console.log(`Max Queue Size: ${config.max_queue_size}`);
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        config,
        singleSubmissionTests: await testSingleSubmissionLimits(),
        batchTests: await testBatchLimits(),
        multiTestCaseTests: await testMultiTestCaseLimits()
    };
    
    // Save results to file
    const filename = `judge0-time-limit-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    
    console.log(`\n=== Test Results Summary ===`);
    console.log(`Results saved to: ${filename}`);
    
    // Analyze and display key findings
    console.log('\n=== Key Findings ===');
    
    // Single submission analysis
    const singleSuccessful = results.singleSubmissionTests.filter(r => r.status === 'Accepted');
    const singleMaxTime = singleSuccessful.length > 0 ? 
        Math.max(...singleSuccessful.map(r => r.expectedTime)) : 0;
    console.log(`Single Submission: Max successful time = ${singleMaxTime}s`);
    
    // Batch analysis
    const batchSuccessful = results.batchTests.filter(r => r.successRate > 0.8);
    const batchMaxTotal = batchSuccessful.length > 0 ? 
        Math.max(...batchSuccessful.map(r => r.expectedTotalTime)) : 0;
    console.log(`Batch Submission: Max successful total time = ${batchMaxTotal}s`);
    
    // Multi-test case analysis
    const multiSuccessful = results.multiTestCaseTests.filter(r => r.successRate > 0);
    const multiMaxCases = multiSuccessful.length > 0 ? 
        Math.max(...multiSuccessful.map(r => r.config.testCases)) : 0;
    const multiMaxTime = multiSuccessful.length > 0 ? 
        Math.max(...multiSuccessful.map(r => r.config.testCases * r.config.timePerCase)) : 0;
    console.log(`Multi-Test Case: Max successful test cases = ${multiMaxCases}`);
    console.log(`Multi-Test Case: Max successful total time = ${multiMaxTime}s`);
    
    return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { runAllTests, getJudge0Config }; 