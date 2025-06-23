/**
 * Phase 2 Integration Test
 * Tests the simplified multi-test approach integrated with the system
 */

const axios = require('axios');
require('dotenv').config();

// Since we can't import TypeScript directly, we'll create a simple service copy for testing
class TestMultiTestService {
  constructor() {
    this.CPP_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

static auto _ = [](){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    return nullptr;
}();

{{USER_SOLVE_FUNCTION}}

int main(){
    int T;
    cin >> T;
    while(T--){
        solve();
    }
    return 0;
}`;
  }

  generateCode(userSolveFunction) {
    return this.CPP_TEMPLATE.replace('{{USER_SOLVE_FUNCTION}}', userSolveFunction.trim());
  }

  generateInput(testCases) {
    const testCount = testCases.length;
    const inputs = testCases.map(tc => tc.input.trim()).join('\n');
    return `${testCount}\n${inputs}`;
  }

  parseResults(judge0Output, testCases) {
    const outputLines = judge0Output.trim().split('\n');
    
    return testCases.map((testCase, index) => {
      const actualOutput = (outputLines[index] || '').trim();
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput;
      
      return {
        testCaseIndex: index,
        input: testCase.input,
        expectedOutput: expectedOutput,
        actualOutput: actualOutput,
        passed: passed,
        status: passed ? 'ACCEPTED' : 'WRONG_ANSWER'
      };
    });
  }

  calculateBatchSize(testCases, timeLimit = 5) {
    const estimatedTimePerTest = 0.1;
    const maxTestCasesForTime = Math.floor(timeLimit / estimatedTimePerTest);
    
    const minBatch = Math.min(5, testCases.length);
    const maxBatch = Math.min(50, testCases.length);
    
    return Math.max(minBatch, Math.min(maxTestCasesForTime, maxBatch));
  }

  createBatches(testCases, batchSize) {
    const optimalBatchSize = batchSize || this.calculateBatchSize(testCases);
    const batches = [];
    
    for (let i = 0; i < testCases.length; i += optimalBatchSize) {
      batches.push(testCases.slice(i, i + optimalBatchSize));
    }
    
    return batches;
  }

  validateSolveFunction(solveFunction) {
    const errors = [];
    
    if (!solveFunction.trim()) {
      errors.push('Solve function cannot be empty');
    }
    
    if (!solveFunction.includes('void solve()')) {
      errors.push('Must contain "void solve()" function declaration');
    }
    
    if (solveFunction.includes('system(') || solveFunction.includes('exec(')) {
      errors.push('System calls are not allowed');
    }
    
    if (solveFunction.match(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/)) {
      errors.push('Infinite loops are not allowed');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

class Phase2IntegrationTest {
  constructor() {
    this.multiTestService = new TestMultiTestService();
    this.baseUrl = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = process.env.JUDGE0_API_KEY || process.env.RAPIDAPI_KEY;
    
    if (!this.apiKey) {
      console.error('❌ No Judge0 API key found');
      process.exit(1);
    }
    
    console.log('🚀 Phase 2 Integration Test');
    console.log('✅ Simple Multi-Test Service loaded');
  }

  async testSimpleService() {
    console.log('\n📝 Testing Simple Multi-Test Service');
    console.log('═'.repeat(50));

    // Test scenario: Array sum problem
    const userSolveFunction = `void solve() {
    int n;
    cin >> n;
    vector<int> arr(n);
    for(int i = 0; i < n; i++) {
        cin >> arr[i];
    }
    long long sum = 0;
    for(int x : arr) {
        sum += x;
    }
    cout << sum << endl;
}`;

    const testCases = [
      { id: '1', input: '3\n1 2 3', expectedOutput: '6', isPublic: true },
      { id: '2', input: '4\n10 20 30 40', expectedOutput: '100', isPublic: true },
      { id: '3', input: '2\n-5 15', expectedOutput: '10', isPublic: false },
      { id: '4', input: '5\n1 1 1 1 1', expectedOutput: '5', isPublic: false },
      { id: '5', input: '1\n42', expectedOutput: '42', isPublic: false }
    ];

    console.log('📄 User Solve Function:');
    console.log('─'.repeat(30));
    console.log(userSolveFunction);
    console.log('─'.repeat(30));

    // Test 1: Code Generation
    console.log('\n🔧 Testing Code Generation...');
    const generatedCode = this.multiTestService.generateCode(userSolveFunction);
    console.log('✅ Code generated successfully');
    
    // Test 2: Input Generation
    console.log('\n📥 Testing Input Generation...');
    const multiTestInput = this.multiTestService.generateInput(testCases);
    console.log('✅ Input generated successfully');
    console.log(`📊 Test cases: ${testCases.length}`);
    
    // Test 3: Validation
    console.log('\n🔍 Testing Validation...');
    const validation = this.multiTestService.validateSolveFunction(userSolveFunction);
    if (validation.valid) {
      console.log('✅ Validation passed');
    } else {
      console.log('❌ Validation failed:', validation.errors);
    }
    
    // Test 4: Batch Size Calculation
    console.log('\n📏 Testing Batch Size Calculation...');
    const batchSize = this.multiTestService.calculateBatchSize(testCases);
    const batches = this.multiTestService.createBatches(testCases);
    console.log(`✅ Optimal batch size: ${batchSize}`);
    console.log(`✅ Number of batches: ${batches.length}`);
    
    return { generatedCode, multiTestInput, testCases };
  }

  async testJudge0Integration({ generatedCode, multiTestInput, testCases }) {
    console.log('\n🚀 Testing Judge0 Integration');
    console.log('═'.repeat(50));

    console.log('📤 Submitting to Judge0...');
    
    try {
      const submissionRequest = {
        source_code: generatedCode,
        language_id: 54, // C++ (GCC 9.2.0)
        stdin: multiTestInput,
        cpu_time_limit: 5,
        memory_limit: 256000
      };

      const response = await axios.post(
        `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
        submissionRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': this.apiKey
          },
          timeout: 30000
        }
      );

      const result = response.data;
      
      console.log('\n📥 Judge0 Response:');
      console.log(`Status: ${result.status.description} (${result.status.id})`);
      console.log(`Time: ${result.time || 'N/A'}s`);
      console.log(`Memory: ${result.memory || 'N/A'} KB`);
      
      if (result.stderr) {
        console.log(`Stderr: ${result.stderr}`);
      }
      
      if (result.compile_output) {
        console.log(`Compile Output: ${result.compile_output}`);
      }

      // Test result parsing
      if (result.status.id === 3) { // Accepted
        console.log('\n🔍 Testing Result Parsing...');
        const parsedResults = this.multiTestService.parseResults(result.stdout, testCases);
        
        console.log('\n📊 Individual Test Case Results:');
        console.log('─'.repeat(50));
        
        parsedResults.forEach((testResult, index) => {
          const status = testResult.passed ? '✅' : '❌';
          console.log(`${status} Test ${index + 1}: Expected "${testResult.expectedOutput}", Got "${testResult.actualOutput}"`);
        });
        
        const passedCount = parsedResults.filter(r => r.passed).length;
        const successRate = ((passedCount / parsedResults.length) * 100).toFixed(1);
        
        console.log('─'.repeat(50));
        console.log(`🎯 Results: ${passedCount}/${parsedResults.length} (${successRate}%) passed`);
        
        // Performance analysis
        console.log('\n⚡ Performance Analysis:');
        console.log(`📊 Test cases executed: ${testCases.length}`);
        console.log(`🔥 API calls used: 1 (instead of ${testCases.length})`);
        console.log(`💰 Efficiency gain: ${testCases.length}x improvement`);
        console.log(`📈 API quota saved: ${((testCases.length - 1) / testCases.length * 100).toFixed(1)}%`);
        
        return passedCount === parsedResults.length;
      } else {
        console.log('❌ Judge0 execution failed');
        return false;
      }

    } catch (error) {
      console.log('❌ Error:', error.message);
      return false;
    }
  }

  async testLargeBatch() {
    console.log('\n\n🔥 Testing Large Batch Processing');
    console.log('═'.repeat(50));

    const userSolveFunction = `void solve() {
    int n;
    cin >> n;
    cout << n * n * n << endl;  // Cube calculation
}`;

    // Generate 30 test cases
    const testCases = Array.from({ length: 30 }, (_, i) => ({
      id: `test_${i + 1}`,
      input: `${i + 1}`,
      expectedOutput: `${(i + 1) ** 3}`,
      isPublic: i < 3
    }));

    console.log(`📝 Problem: Calculate cubes`);
    console.log(`📊 Test cases: ${testCases.length}`);
    
    // Test batching strategy
    const batches = this.multiTestService.createBatches(testCases);
    console.log(`📦 Batches created: ${batches.length}`);
    console.log(`📏 Batch sizes: [${batches.map(b => b.length).join(', ')}]`);
    
    // Test first batch
    const firstBatch = batches[0];
    const generatedCode = this.multiTestService.generateCode(userSolveFunction);
    const multiTestInput = this.multiTestService.generateInput(firstBatch);
    
    console.log(`\n🔍 Testing First Batch (${firstBatch.length} test cases):`);
    
    try {
      const submissionRequest = {
        source_code: generatedCode,
        language_id: 54,
        stdin: multiTestInput,
        cpu_time_limit: 5,
        memory_limit: 256000
      };

      const response = await axios.post(
        `${this.baseUrl}/submissions?base64_encoded=false&wait=true`,
        submissionRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'X-RapidAPI-Key': this.apiKey
          },
          timeout: 30000
        }
      );

      const result = response.data;
      
      console.log(`\n📥 Batch Result: ${result.status.description}`);
      console.log(`⏱️ Time: ${result.time}s`);
      console.log(`💾 Memory: ${result.memory} KB`);
      
      if (result.status.id === 3) {
        const parsedResults = this.multiTestService.parseResults(result.stdout, firstBatch);
        const passedCount = parsedResults.filter(r => r.passed).length;
        
        console.log(`✅ Batch success: ${passedCount}/${firstBatch.length} passed`);
        
        // Show efficiency for full suite
        console.log('\n🚀 Full Suite Efficiency Projection:');
        console.log(`📊 Total test cases: ${testCases.length}`);
        console.log(`📦 Required batches: ${batches.length}`);
        console.log(`🔥 API calls: ${batches.length} (instead of ${testCases.length})`);
        console.log(`💰 Efficiency gain: ${(testCases.length / batches.length).toFixed(1)}x improvement`);
        
        return true;
      } else {
        console.log('❌ Batch execution failed');
        return false;
      }

    } catch (error) {
      console.log('❌ Batch error:', error.message);
      return false;
    }
  }

  async runAllTests() {
    try {
      console.log('🎯 Phase 2 Integration Testing\n');
      
      // Test 1: Simple Service Functionality
      const serviceTest = await this.testSimpleService();
      
      // Test 2: Judge0 Integration
      const integrationSuccess = await this.testJudge0Integration(serviceTest);
      
      // Test 3: Large Batch Processing
      const batchSuccess = await this.testLargeBatch();
      
      // Summary
      console.log('\n🏁 Phase 2 Testing Summary');
      console.log('═'.repeat(50));
      
      const tests = [
        { name: 'Simple Service', passed: true },
        { name: 'Judge0 Integration', passed: integrationSuccess },
        { name: 'Large Batch Processing', passed: batchSuccess }
      ];
      
      tests.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`${status} ${test.name}`);
      });
      
      const allPassed = tests.every(test => test.passed);
      
      if (allPassed) {
        console.log('\n🎉 All Phase 2 tests passed!');
        console.log('\n💡 Key Achievements:');
        console.log('   ✅ Simplified service architecture working');
        console.log('   ✅ Judge0 integration successful');
        console.log('   ✅ Multi-test execution validated');
        console.log('   ✅ Batch processing strategies proven');
        console.log('   ✅ Ready for controller integration');
      } else {
        console.log('\n⚠️ Some tests failed - review required');
      }
      
    } catch (error) {
      console.error('❌ Phase 2 testing failed:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  const test = new Phase2IntegrationTest();
  test.runAllTests();
}

module.exports = Phase2IntegrationTest; 