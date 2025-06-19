const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class Judge0BatchTester {
  constructor() {
    this.apiKey = process.env.JUDGE0_API_KEY;
    this.baseUrl = 'https://judge0-ce.p.rapidapi.com';
    this.results = [];
    this.maxRetries = 3;
    this.delayBetweenTests = 2000; // 2 seconds between tests to avoid rate limiting
    
    if (!this.apiKey) {
      throw new Error('JUDGE0_API_KEY not found in environment variables');
    }
    
    console.log('🚀 Judge0 Batch Limit Tester Initialized');
    console.log(`📡 Base URL: ${this.baseUrl}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 8)}...`);
  }

  // Generate sample code submissions for testing
  generateSubmissions(count) {
    const sampleCodes = [
      {
        source_code: `#include<iostream>\nusing namespace std;\nint main(){\n    cout << "Hello World " << ${Math.random()} << endl;\n    return 0;\n}`,
        language_id: 54, // C++ (GCC 9.2.0)
        stdin: "",
        expected_output: null
      },
      {
        source_code: `print(f"Python test {${Math.random()}}")`,
        language_id: 71, // Python (3.8.1)
        stdin: "",
        expected_output: null
      },
      {
        source_code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Java test " + ${Math.random()});\n    }\n}`,
        language_id: 62, // Java (OpenJDK 13.0.1)
        stdin: "",
        expected_output: null
      },
      {
        source_code: `const fs = require('fs');\nconsole.log('Node.js test', ${Math.random()});`,
        language_id: 63, // JavaScript (Node.js 12.14.0)
        stdin: "",
        expected_output: null
      },
      {
        source_code: `package main\nimport "fmt"\nfunc main() {\n    fmt.Printf("Go test %f\\n", ${Math.random()})\n}`,
        language_id: 60, // Go (1.13.5)
        stdin: "",
        expected_output: null
      }
    ];

    const submissions = [];
    for (let i = 0; i < count; i++) {
      const template = sampleCodes[i % sampleCodes.length];
      submissions.push({
        ...template,
        source_code: template.source_code.replace(/\$\{Math\.random\(\)\}/g, Math.random()),
      });
    }
    
    return submissions;
  }

  // Make API request with retry logic
  async makeRequest(submissions, retryCount = 0) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${this.baseUrl}/submissions/batch`,
        { submissions },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': this.apiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        data: response.data,
        responseTime,
        statusCode: response.status,
        requestSize: JSON.stringify(submissions).length
      };
      
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`⚠️  Request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
        await this.sleep(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(submissions, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.response?.data || error.message,
        statusCode: error.response?.status || 'TIMEOUT',
        requestSize: JSON.stringify(submissions).length
      };
    }
  }

  // Test batch with specific size
  async testBatchSize(batchSize) {
    console.log(`\n🧪 Testing batch size: ${batchSize}`);
    
    const submissions = this.generateSubmissions(batchSize);
    const result = await this.makeRequest(submissions);
    
    const testResult = {
      batchSize,
      timestamp: new Date().toISOString(),
      ...result
    };
    
    if (result.success) {
      console.log(`✅ SUCCESS - Batch size ${batchSize}`);
      console.log(`   📊 Response time: ${result.responseTime}ms`);
      console.log(`   📦 Request size: ${(result.requestSize / 1024).toFixed(2)} KB`);
      console.log(`   🔢 Submissions created: ${result.data?.length || 'Unknown'}`);
    } else {
      console.log(`❌ FAILED - Batch size ${batchSize}`);
      console.log(`   🚨 Status: ${result.statusCode}`);
      console.log(`   💬 Error: ${JSON.stringify(result.error, null, 2)}`);
    }
    
    this.results.push(testResult);
    return result.success;
  }

  // Progressive batch size testing
  async runProgressiveTest() {
    console.log('\n🔄 Starting Progressive Batch Size Test');
    console.log('=' .repeat(50));
    
    // Define test batch sizes - start small and increase exponentially
    const batchSizes = [
      20, 25, 30, 40, 50,
      75, 100, 150, 200, 300, 500, 750, 1000,
      1500, 2000, 3000, 5000, 7500, 10000
    ];
    
    let lastSuccessfulSize = 0;
    let firstFailureSize = null;
    
    for (const batchSize of batchSizes) {
      const success = await this.testBatchSize(batchSize);
      
      if (success) {
        lastSuccessfulSize = batchSize;
      } else {
        firstFailureSize = batchSize;
        console.log(`\n🛑 Found limit at batch size: ${batchSize}`);
        break;
      }
      
      // Wait between tests to avoid rate limiting
      if (batchSize < batchSizes[batchSizes.length - 1]) {
        console.log(`⏳ Waiting ${this.delayBetweenTests/1000}s before next test...`);
        await this.sleep(this.delayBetweenTests);
      }
    }
    
    return { lastSuccessfulSize, firstFailureSize };
  }

  // Test concurrent batch requests
  async testConcurrentBatches() {
    console.log('\n🔄 Testing Concurrent Batch Requests');
    console.log('=' .repeat(50));
    
    const batchSize = 10; // Use moderate batch size for concurrency test
    const concurrentRequests = [1, 2, 3, 5, 8, 10];
    
    for (const concurrency of concurrentRequests) {
      console.log(`\n🔀 Testing ${concurrency} concurrent batches of ${batchSize} submissions each`);
      
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        const submissions = this.generateSubmissions(batchSize);
        promises.push(this.makeRequest(submissions));
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`   ✅ Successful: ${successful}/${concurrency}`);
      console.log(`   ❌ Failed: ${failed}/${concurrency}`);
      console.log(`   ⏱️  Total time: ${endTime - startTime}ms`);
      
      this.results.push({
        testType: 'concurrent',
        concurrency,
        batchSize,
        successful,
        failed,
        totalTime: endTime - startTime,
        timestamp: new Date().toISOString()
      });
      
      if (failed > 0) {
        console.log(`🛑 Concurrent limit reached at ${concurrency} requests`);
        break;
      }
      
      await this.sleep(this.delayBetweenTests);
    }
  }

  // Analyze performance patterns
  analyzeResults() {
    console.log('\n📊 Performance Analysis');
    console.log('=' .repeat(50));
    
    const successfulBatches = this.results.filter(r => r.success && r.batchSize);
    
    if (successfulBatches.length === 0) {
      console.log('❌ No successful batch requests to analyze');
      return;
    }
    
    // Response time analysis
    const responseTimes = successfulBatches.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    // Throughput analysis
    const throughputs = successfulBatches.map(r => r.batchSize / (r.responseTime / 1000));
    const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length;
    
    console.log(`📈 Response Time Stats:`);
    console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   Min: ${minResponseTime}ms`);
    console.log(`   Max: ${maxResponseTime}ms`);
    
    console.log(`\n🚀 Throughput Stats:`);
    console.log(`   Average: ${avgThroughput.toFixed(2)} submissions/second`);
    
    // Find performance patterns
    const largeSuccessfulBatches = successfulBatches.filter(r => r.batchSize >= 100);
    if (largeSuccessfulBatches.length > 0) {
      const avgLargeResponseTime = largeSuccessfulBatches
        .map(r => r.responseTime)
        .reduce((a, b) => a + b, 0) / largeSuccessfulBatches.length;
      
      console.log(`\n📊 Large Batch Performance (≥100 submissions):`);
      console.log(`   Average response time: ${avgLargeResponseTime.toFixed(2)}ms`);
      console.log(`   Batches tested: ${largeSuccessfulBatches.length}`);
    }
  }

  // Generate detailed report
  generateReport() {
    const reportPath = path.join(__dirname, '../logs/judge0-batch-test-report.json');
    const summaryPath = path.join(__dirname, '../logs/judge0-batch-test-summary.txt');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(reportPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Save detailed JSON report
    const report = {
      testDate: new Date().toISOString(),
      apiKey: this.apiKey.substring(0, 8) + '...',
      baseUrl: this.baseUrl,
      results: this.results,
      summary: this.generateSummary()
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    const summary = this.generateTextSummary();
    fs.writeFileSync(summaryPath, summary);
    
    console.log(`\n📄 Reports generated:`);
    console.log(`   📋 Detailed: ${reportPath}`);
    console.log(`   📝 Summary: ${summaryPath}`);
  }

  generateSummary() {
    const successfulBatches = this.results.filter(r => r.success && r.batchSize);
    const maxSuccessfulBatch = successfulBatches.length > 0 
      ? Math.max(...successfulBatches.map(r => r.batchSize))
      : 0;
    
    const failedBatches = this.results.filter(r => !r.success && r.batchSize);
    const minFailedBatch = failedBatches.length > 0
      ? Math.min(...failedBatches.map(r => r.batchSize))
      : null;
    
    return {
      totalTests: this.results.length,
      successfulBatches: successfulBatches.length,
      failedBatches: failedBatches.length,
      maxSuccessfulBatchSize: maxSuccessfulBatch,
      minFailedBatchSize: minFailedBatch,
      practicalLimit: maxSuccessfulBatch,
      testDuration: this.results.length > 0 ? 
        new Date(this.results[this.results.length - 1].timestamp).getTime() - 
        new Date(this.results[0].timestamp).getTime() : 0
    };
  }

  generateTextSummary() {
    const summary = this.generateSummary();
    
    return `
Judge0 Batch Request Limit Test Report
======================================

Test Date: ${new Date().toISOString()}
API Endpoint: ${this.baseUrl}
API Key: ${this.apiKey.substring(0, 8)}...

RESULTS SUMMARY:
===============
• Total Tests Conducted: ${summary.totalTests}
• Successful Batches: ${summary.successfulBatches}
• Failed Batches: ${summary.failedBatches}
• Maximum Successful Batch Size: ${summary.maxSuccessfulBatchSize} submissions
• Minimum Failed Batch Size: ${summary.minFailedBatchSize || 'None'}
• Practical Batch Limit: ${summary.practicalLimit} submissions
• Test Duration: ${(summary.testDuration / 1000 / 60).toFixed(2)} minutes

RECOMMENDATIONS:
===============
${summary.maxSuccessfulBatchSize >= 1000 
  ? '✅ Judge0 supports large batch requests (1000+ submissions)'
  : summary.maxSuccessfulBatchSize >= 100
  ? '⚠️  Judge0 supports moderate batch requests (100+ submissions)'
  : '❌ Judge0 has strict batch size limits (<100 submissions)'
}

${summary.maxSuccessfulBatchSize > 0 
  ? `• Safe batch size for production: ${Math.floor(summary.maxSuccessfulBatchSize * 0.8)} submissions`
  : '• Consider using individual submissions instead of batches'
}

• Monitor response times for batches over ${Math.floor(summary.maxSuccessfulBatchSize * 0.5)} submissions
• Implement retry logic for failed batch requests
• Consider rate limiting to avoid API quota exhaustion

DETAILED RESULTS:
================
${this.results.filter(r => r.batchSize).map(r => 
  `Batch Size: ${r.batchSize.toString().padStart(4)} | ` +
  `Status: ${r.success ? '✅ SUCCESS' : '❌ FAILED'.padEnd(9)} | ` +
  `Time: ${(r.responseTime || 0).toString().padStart(5)}ms | ` +
  `Size: ${((r.requestSize || 0) / 1024).toFixed(1).padStart(6)}KB`
).join('\n')}
`;
  }

  // Utility function for delays
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main test runner
  async runAllTests() {
    console.log('🎯 Starting Judge0 Batch Limit Tests');
    console.log('====================================');
    
    try {
      // Test progressive batch sizes
      const { lastSuccessfulSize, firstFailureSize } = await this.runProgressiveTest();
      
      // Test concurrent batches
      await this.testConcurrentBatches();
      
      // Analyze results
      this.analyzeResults();
      
      // Generate reports
      this.generateReport();
      
      console.log('\n🎉 Testing Complete!');
      console.log(`📊 Maximum successful batch size: ${lastSuccessfulSize}`);
      if (firstFailureSize) {
        console.log(`🚨 First failure at batch size: ${firstFailureSize}`);
      }
      
      return {
        maxBatchSize: lastSuccessfulSize,
        firstFailure: firstFailureSize,
        totalTests: this.results.length
      };
      
    } catch (error) {
      console.error('💥 Test runner failed:', error);
      throw error;
    }
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  async function main() {
    try {
      const tester = new Judge0BatchTester();
      await tester.runAllTests();
      process.exit(0);
    } catch (error) {
      console.error('🚨 Test execution failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = Judge0BatchTester; 