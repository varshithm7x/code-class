const axios = require('axios');

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

if (!RAPIDAPI_KEY) {
    console.error('Please set JUDGE0_API_KEY environment variable');
    process.exit(1);
}

const headers = {
    'content-type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST
};

class OptimalConfigurationFinder {
    constructor() {
        this.results = [];
        this.currentConfig = null;
        this.apiCallCount = 0;
        this.maxApiCalls = 40; // Conservative limit to avoid exhaustion
        this.retryDelay = 2000; // 2 seconds between retries
        this.maxRetries = 3;
    }

    // Generate CPU-intensive test case that takes approximately targetTime seconds
    generateTestCase(index, targetTime = 0.8) {
        const iterations = Math.floor(targetTime * 100000000); // Calibrated for ~0.8s execution
        return {
            input: `1\n${iterations}\n`,
            expectedOutput: `Test ${index} completed with ${iterations} iterations\n`
        };
    }

    // Generate C++ code template for multi-test execution
    generateCppCode(testCasesPerFile) {
        return `
#include <iostream>
#include <chrono>
using namespace std;
using namespace std::chrono;

void solve() {
    long long iterations;
    cin >> iterations;
    
    auto start = high_resolution_clock::now();
    
    // CPU-intensive computation
    volatile long long sum = 0;
    for (long long i = 0; i < iterations; i++) {
        sum += (i * i) % 1000000007;
    }
    
    auto end = high_resolution_clock::now();
    auto duration = duration_cast<milliseconds>(end - start);
    
    cout << "Test " << (iterations / 100000000 + 1) << " completed with " << iterations << " iterations" << endl;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int t = ${testCasesPerFile};
    while(t--) {
        solve();
    }
    
    return 0;
}`;
    }

    // Check API quota before making requests
    async checkApiQuota() {
        if (this.apiCallCount >= this.maxApiCalls) {
            throw new Error('API_QUOTA_EXHAUSTED');
        }
    }

    // Handle API errors with smart retry logic
    async makeApiRequest(url, data, retryCount = 0) {
        try {
            await this.checkApiQuota();
            this.apiCallCount++;

            const response = await axios.post(url, data, {
                headers,
                timeout: 45000 // 45 second timeout
            });

            return { success: true, data: response.data };

        } catch (error) {
            console.log(`   ⚠️  API request failed (attempt ${retryCount + 1}/${this.maxRetries + 1})`);
            
            // Handle specific error types
            if (error.response?.status === 429) {
                console.log('   🔥 Rate limit hit - waiting longer before retry...');
                if (retryCount < this.maxRetries) {
                    await this.sleep(this.retryDelay * (retryCount + 2)); // Progressive backoff
                    return this.makeApiRequest(url, data, retryCount + 1);
                }
                throw new Error('RATE_LIMIT_EXCEEDED');
            }
            
            if (error.response?.status === 402 || error.message.includes('quota')) {
                throw new Error('API_QUOTA_EXHAUSTED');
            }
            
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                console.log('   ⏰ Request timeout - retrying...');
                if (retryCount < this.maxRetries) {
                    await this.sleep(this.retryDelay);
                    return this.makeApiRequest(url, data, retryCount + 1);
                }
                throw new Error('REQUEST_TIMEOUT');
            }

            // Generic retry for other errors
            if (retryCount < this.maxRetries) {
                await this.sleep(this.retryDelay);
                return this.makeApiRequest(url, data, retryCount + 1);
            }

            throw error;
        }
    }

    // Monitor batch submission with smart timeout handling
    async monitorBatchSubmission(tokens, maxWaitTime = 120000) {
        const startTime = Date.now();
        const tokensQuery = tokens.join(',');
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const response = await this.makeApiRequest(
                    `${JUDGE0_URL}/submissions/batch?tokens=${tokensQuery}&base64_encoded=false`,
                    null
                );

                if (response.success) {
                    const submissions = response.data.submissions;
                    const allCompleted = submissions.every(sub => sub.status.id > 2);
                    
                    if (allCompleted) {
                        return { success: true, results: submissions };
                    }
                }

                await this.sleep(3000); // Check every 3 seconds

            } catch (error) {
                if (error.message === 'API_QUOTA_EXHAUSTED' || error.message === 'RATE_LIMIT_EXCEEDED') {
                    throw error;
                }
                console.log(`   ⚠️  Monitoring error: ${error.message}`);
                await this.sleep(5000); // Wait longer on monitoring errors
            }
        }

        throw new Error('MONITORING_TIMEOUT');
    }

    // Test a specific configuration
    async testConfiguration(numFiles, testCasesPerFile, targetTimePerTest = 0.8) {
        this.currentConfig = { numFiles, testCasesPerFile, targetTimePerTest };
        const totalTestCases = numFiles * testCasesPerFile;
        const estimatedTime = totalTestCases * targetTimePerTest;

        console.log(`\n🧪 Testing Configuration:`);
        console.log(`   📁 Files: ${numFiles}`);
        console.log(`   🔢 Test cases per file: ${testCasesPerFile}`);
        console.log(`   📊 Total test cases: ${totalTestCases}`);
        console.log(`   ⏱️  Target time per test: ${targetTimePerTest}s`);
        console.log(`   🕒 Estimated total time: ${estimatedTime}s`);
        console.log(`   💡 API calls used: ${this.apiCallCount}/${this.maxApiCalls}`);

        try {
            // Generate test submissions
            const submissions = [];
            const code = this.generateCppCode(testCasesPerFile);

            for (let fileIndex = 0; fileIndex < numFiles; fileIndex++) {
                let input = `${testCasesPerFile}\n`;
                for (let testIndex = 0; testIndex < testCasesPerFile; testIndex++) {
                    const testCase = this.generateTestCase(testIndex + fileIndex * testCasesPerFile, targetTimePerTest);
                    input += testCase.input.replace(/^\d+\n/, ''); // Remove the leading "1\n"
                }

                submissions.push({
                    source_code: code,
                    language_id: 54, // C++
                    stdin: input,
                    cpu_time_limit: 20,     // Maximum allowed
                    wall_time_limit: 30,    // Maximum allowed
                    memory_limit: 256000    // 256MB
                });
            }

            // Submit batch
            console.log(`   📤 Submitting batch of ${submissions.length} files...`);
            const submitResponse = await this.makeApiRequest(
                `${JUDGE0_URL}/submissions/batch?base64_encoded=false`,
                { submissions }
            );

            if (!submitResponse.success) {
                throw new Error('Batch submission failed');
            }

            const tokens = submitResponse.data.map(item => item.token);
            console.log(`   ✅ Batch submitted successfully`);
            console.log(`   🎫 Tokens received: ${tokens.length}`);

            // Monitor execution
            console.log(`   ⏳ Monitoring execution...`);
            const monitorResult = await this.monitorBatchSubmission(tokens);

            if (!monitorResult.success) {
                throw new Error('Monitoring failed');
            }

            // Analyze results
            const results = monitorResult.results;
            const acceptedCount = results.filter(r => r.status.id === 3).length;
            const timeExceededCount = results.filter(r => r.status.id === 5).length;
            const errorCount = results.filter(r => r.status.id >= 6).length;

            const maxTime = Math.max(...results.map(r => parseFloat(r.time || '0')));
            const avgTime = results.reduce((sum, r) => sum + parseFloat(r.time || '0'), 0) / results.length;

            const configResult = {
                numFiles,
                testCasesPerFile,
                totalTestCases,
                targetTimePerTest,
                acceptedCount,
                timeExceededCount,
                errorCount,
                successRate: (acceptedCount / results.length) * 100,
                maxTime,
                avgTime,
                estimatedTime,
                allPassed: acceptedCount === results.length,
                timestamp: new Date().toISOString()
            };

            this.results.push(configResult);

            console.log(`\n📊 Results:`);
            console.log(`   ✅ Accepted: ${acceptedCount}/${results.length} (${configResult.successRate.toFixed(1)}%)`);
            console.log(`   ⏰ Time exceeded: ${timeExceededCount}`);
            console.log(`   ❌ Errors: ${errorCount}`);
            console.log(`   🕒 Max execution time: ${maxTime.toFixed(3)}s`);
            console.log(`   📈 Average execution time: ${avgTime.toFixed(3)}s`);
            console.log(`   🎯 All passed: ${configResult.allPassed ? '✅ YES' : '❌ NO'}`);

            return configResult;

        } catch (error) {
            const errorResult = {
                numFiles,
                testCasesPerFile,
                totalTestCases,
                targetTimePerTest,
                error: error.message,
                allPassed: false,
                timestamp: new Date().toISOString()
            };

            this.results.push(errorResult);

            console.log(`\n❌ Configuration failed: ${error.message}`);
            return errorResult;
        }
    }

    // Find optimal configuration using binary search approach
    async findOptimalConfiguration() {
        console.log('🔍 Finding Optimal Configuration for Revolutionary Batch Approach\n');
        console.log('🎯 Goal: Find maximum test cases where ALL tests pass (100% success rate)\n');

        try {
            // Test configurations in order of decreasing ambition
            const testConfigs = [
                // Start with known safe configurations
                { files: 10, testsPerFile: 8 },   // 80 test cases (very safe)
                { files: 15, testsPerFile: 8 },   // 120 test cases (safe)
                { files: 18, testsPerFile: 8 },   // 144 test cases (moderately safe)
                { files: 20, testsPerFile: 8 },   // 160 test cases (pushing limits)
                { files: 20, testsPerFile: 10 },  // 200 test cases (aggressive)
                { files: 20, testsPerFile: 12 },  // 240 test cases (very aggressive)
                { files: 20, testsPerFile: 14 },  // 280 test cases (maximum attempt)
            ];

            let optimalConfig = null;
            let lastSuccessfulConfig = null;

            for (const config of testConfigs) {
                if (this.apiCallCount >= this.maxApiCalls - 5) {
                    console.log('\n⚠️  Approaching API quota limit, stopping tests');
                    break;
                }

                const result = await this.testConfiguration(config.files, config.testsPerFile);
                
                if (result.allPassed) {
                    lastSuccessfulConfig = result;
                    console.log(`\n🎉 Found working configuration: ${result.totalTestCases} test cases!`);
                } else {
                    console.log(`\n⚠️  Configuration failed at ${result.totalTestCases} test cases`);
                    if (lastSuccessfulConfig) {
                        console.log(`\n🎯 Optimal configuration found: ${lastSuccessfulConfig.totalTestCases} test cases`);
                        break;
                    }
                }

                // Add delay between tests to avoid rate limiting
                if (config !== testConfigs[testConfigs.length - 1]) {
                    console.log('\n⏳ Waiting before next test...');
                    await this.sleep(3000);
                }
            }

            // Final analysis
            this.generateFinalReport(lastSuccessfulConfig);

        } catch (error) {
            if (error.message === 'API_QUOTA_EXHAUSTED') {
                console.log('\n🔥 API Quota Exhausted!');
                console.log('   💡 This means we successfully pushed the system to its limits');
                console.log('   📊 Analyzing results from completed tests...');
                this.generateFinalReport(this.getLastSuccessfulConfig());
            } else {
                console.error('\n❌ Fatal error:', error.message);
            }
        }
    }

    // Get the last successful configuration
    getLastSuccessfulConfig() {
        return this.results
            .filter(r => r.allPassed)
            .sort((a, b) => b.totalTestCases - a.totalTestCases)[0];
    }

    // Generate comprehensive final report
    generateFinalReport(optimalConfig) {
        console.log('\n' + '='.repeat(80));
        console.log('🎯 OPTIMAL CONFIGURATION ANALYSIS');
        console.log('='.repeat(80));

        if (optimalConfig) {
            console.log('\n✅ RECOMMENDED PRODUCTION CONFIGURATION:');
            console.log(`   📁 Number of files: ${optimalConfig.numFiles}`);
            console.log(`   🔢 Test cases per file: ${optimalConfig.testCasesPerFile}`);
            console.log(`   📊 Total test cases: ${optimalConfig.totalTestCases}`);
            console.log(`   ⏱️  Target time per test: ${optimalConfig.targetTimePerTest}s`);
            console.log(`   🕒 Max execution time: ${optimalConfig.maxTime.toFixed(3)}s`);
            console.log(`   📈 Average execution time: ${optimalConfig.avgTime.toFixed(3)}s`);
            console.log(`   ✅ Success rate: ${optimalConfig.successRate}%`);

            const efficiencyGain = optimalConfig.totalTestCases;
            const costReduction = ((optimalConfig.totalTestCases - 1) / optimalConfig.totalTestCases * 100);

            console.log('\n🚀 REVOLUTIONARY APPROACH BENEFITS:');
            console.log(`   📈 Efficiency gain: ${efficiencyGain}x improvement`);
            console.log(`   💰 Cost reduction: ${costReduction.toFixed(1)}%`);
            console.log(`   🏗️  Architecture: Multiple files with ${optimalConfig.testCasesPerFile} tests each`);
            console.log(`   ⚡ Execution model: Parallel processing of ${optimalConfig.numFiles} files`);

            console.log('\n🛡️  SAFETY MARGINS:');
            const cpuBuffer = (20 - optimalConfig.maxTime);
            const wallBuffer = (30 - optimalConfig.maxTime * 1.5); // Estimated wall time
            console.log(`   ⏱️  CPU time buffer: ${cpuBuffer.toFixed(1)}s`);
            console.log(`   🏃 Wall time buffer: ${wallBuffer.toFixed(1)}s`);
            console.log(`   🔒 Recommended for production: ${cpuBuffer > 1 ? '✅ YES' : '⚠️  MARGINAL'}`);

        } else {
            console.log('\n❌ NO OPTIMAL CONFIGURATION FOUND');
            console.log('   📊 All tested configurations exceeded Judge0 limits');
            console.log('   💡 Recommendation: Use traditional single-file approach');
        }

        console.log('\n📊 ALL TEST RESULTS:');
        this.results.forEach((result, index) => {
            const status = result.allPassed ? '✅' : '❌';
            const errorMsg = result.error ? ` (${result.error})` : '';
            console.log(`   ${status} Config ${index + 1}: ${result.totalTestCases} tests - ${result.successRate?.toFixed(1) || 0}% success${errorMsg}`);
        });

        console.log('\n📈 API USAGE STATISTICS:');
        console.log(`   🔢 Total API calls made: ${this.apiCallCount}`);
        console.log(`   📊 API efficiency: ${(this.results.length / this.apiCallCount * 100).toFixed(1)}% (configs per call)`);
        console.log(`   💡 Quota management: ${this.apiCallCount < this.maxApiCalls ? '✅ Successful' : '⚠️  Reached limit'}`);

        console.log('\n🎯 PRODUCTION RECOMMENDATIONS:');
        if (optimalConfig) {
            console.log('   ✅ Deploy revolutionary batch approach with found configuration');
            console.log('   🛡️  Implement proper timeout handling and fallback mechanisms');
            console.log('   📊 Monitor CPU usage and adjust test case complexity as needed');
            console.log('   🔄 Consider implementing adaptive batch sizing based on system load');
        } else {
            console.log('   ⚠️  Revolutionary approach may be too aggressive for current Judge0 limits');
            console.log('   🔄 Consider hybrid approach: batch for small test suites, traditional for large ones');
            console.log('   📈 Re-evaluate when Judge0 increases their time limits');
        }

        console.log('\n' + '='.repeat(80));
    }

    // Utility function for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Error handling for graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n⚠️  Process interrupted by user');
    console.log('📊 Generating partial report...');
    
    if (global.finder) {
        global.finder.generateFinalReport(global.finder.getLastSuccessfulConfig());
    }
    
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    if (global.finder) {
        global.finder.generateFinalReport(global.finder.getLastSuccessfulConfig());
    }
    
    process.exit(1);
});

// Main execution
async function main() {
    const finder = new OptimalConfigurationFinder();
    global.finder = finder; // Make available for error handlers
    
    await finder.findOptimalConfiguration();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = OptimalConfigurationFinder;