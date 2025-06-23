/**
 * Test script for Multi-Test Executor Service
 * Validates the Codeforces-style template approach for batching test cases
 */

const { MultiTestExecutorService } = require('../dist/services/multi-test-executor.service');
const axios = require('axios');

class MultiTestExecutorTester {
  constructor() {
    this.service = new MultiTestExecutorService();
    this.judge0BaseUrl = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
    this.apiKey = process.env.RAPIDAPI_KEY;
    
    if (!this.apiKey) {
      console.error('❌ RAPIDAPI_KEY environment variable required');
      process.exit(1);
    }
  }

  // Test cases for different scenarios
  getTestScenarios() {
    return [
      {
        name: 'Simple Addition Problem',
        userCode: `
void solve() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
}`,
        testCases: [
          { id: '1', input: '1 2', expectedOutput: '3', isPublic: true },
          { id: '2', input: '5 7', expectedOutput: '12', isPublic: true },
          { id: '3', input: '10 20', expectedOutput: '30', isPublic: false },
        ]
      },
      {
        name: 'Array Sum Problem',
        userCode: `
void solve() {
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
}`,
        testCases: [
          { id: '1', input: '3\n1 2 3', expectedOutput: '6', isPublic: true },
          { id: '2', input: '4\n10 20 30 40', expectedOutput: '100', isPublic: true },
          { id: '3', input: '2\n-5 15', expectedOutput: '10', isPublic: false },
        ]
      },
      {
        name: 'User Code with Main Function (needs conversion)',
        userCode: `
#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a * b << endl;
    return 0;
}`,
        testCases: [
          { id: '1', input: '3 4', expectedOutput: '12', isPublic: true },
          { id: '2', input: '7 8', expectedOutput: '56', isPublic: true },
        ]
      },
      {
        name: 'Large Test Case Batch (50 cases)',
        userCode: `
void solve() {
    int n;
    cin >> n;
    cout << n * 2 << endl;
}`,
        testCases: Array.from({ length: 50 }, (_, i) => ({
          id: `test_${i}`,
          input: `${i + 1}`,
          expectedOutput: `${(i + 1) * 2}`,
          isPublic: i < 3
        }))
      }
    ];
  }

  // Test the code generation functionality
  testCodeGeneration() {
    console.log('🧪 Testing Code Generation...\n');
    
    const scenarios = this.getTestScenarios();
    
    for (const scenario of scenarios.slice(0, 3)) { // Test first 3 scenarios
      console.log(`📝 Testing: ${scenario.name}`);
      
      try {
        // Generate multi-test code
        const generatedCode = this.service.generateMultiTestCode(
          scenario.userCode, 
          scenario.testCases
        );
        
        console.log('✅ Code generated successfully');
        
        // Validate generated code
        const validation = this.service.validateGeneratedCode(generatedCode);
        if (validation.valid) {
          console.log('✅ Code validation passed');
        } else {
          console.log('❌ Code validation failed:', validation.errors);
        }
        
        // Test input generation
        const multiTestInput = this.generateMultiTestInput(scenario.testCases);
        console.log(`✅ Generated input for ${scenario.testCases.length} test cases`);
        
        // Show sample of generated code (first 15 lines)
        console.log('\n📄 Generated Code Sample:');
        console.log(generatedCode.split('\n').slice(0, 15).join('\n'));
        console.log('...\n');
        
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      console.log('─'.repeat(60));
    }
  }

  // Test with actual Judge0 execution
  async testJudge0Execution() {
    console.log('\n🚀 Testing Judge0 Execution...\n');
    
    const testScenario = this.getTestScenarios()[0]; // Simple addition
    
    try {
      // Generate the multi-test code
      const generatedCode = this.service.generateMultiTestCode(
        testScenario.userCode,
        testScenario.testCases
      );
      
      // Generate input
      const multiTestInput = this.generateMultiTestInput(testScenario.testCases);
      
      console.log('📤 Submitting to Judge0...');
      console.log(`Input: ${multiTestInput}`);
      
      // Submit to Judge0
      const result = await this.executeWithJudge0(
        generatedCode,
        'cpp',
        multiTestInput
      );
      
      console.log('📥 Judge0 Response:');
      console.log(`Status: ${result.status.description}`);
      console.log(`Output: ${result.stdout}`);
      console.log(`Time: ${result.time}s`);
      console.log(`Memory: ${result.memory} KB`);
      
      if (result.stderr) {
        console.log(`Stderr: ${result.stderr}`);
      }
      
      // Parse and validate results
      if (result.status.id === 3) { // Accepted
        const parsedResults = this.service.parseMultiTestOutput(
          result.stdout,
          testScenario.testCases
        );
        
        console.log('\n📊 Test Case Results:');
        parsedResults.forEach((testResult, index) => {
          const status = testResult.passed ? '✅' : '❌';
          console.log(`${status} Test ${index + 1}: Expected "${testResult.expectedOutput}", Got "${testResult.actualOutput}"`);
        });
        
        const passedCount = parsedResults.filter(r => r.passed).length;
        console.log(`\n🎯 Results: ${passedCount}/${parsedResults.length} test cases passed`);
        
      } else {
        console.log('❌ Judge0 execution failed');
      }
      
    } catch (error) {
      console.log('❌ Execution error:', error.message);
    }
  }

  // Test batch size calculation
  testBatchSizeCalculation() {
    console.log('\n📏 Testing Batch Size Calculation...\n');
    
    const scenarios = [
      { testCases: Array(10).fill(null), expected: 'small batch' },
      { testCases: Array(50).fill(null), expected: 'medium batch' },
      { testCases: Array(200).fill(null), expected: 'large batch, multiple batches needed' }
    ];
    
    scenarios.forEach((scenario, index) => {
      const batchSize = this.service.calculateOptimalBatchSize(scenario.testCases);
      const batches = this.service.createTestBatches(scenario.testCases);
      
      console.log(`📦 Scenario ${index + 1}: ${scenario.testCases.length} test cases`);
      console.log(`   Optimal batch size: ${batchSize}`);
      console.log(`   Number of batches: ${batches.length}`);
      console.log(`   Expected: ${scenario.expected}`);
      console.log();
    });
  }

  // Helper methods
  generateMultiTestInput(testCases) {
    const testCount = testCases.length;
    const inputs = testCases.map(tc => tc.input.trim()).join('\n');
    return `${testCount}\n${inputs}`;
  }

  async executeWithJudge0(code, language, input) {
    const languageId = language === 'cpp' ? 54 : 71; // C++ or Python
    
    const submissionRequest = {
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: 5,
      memory_limit: 256000
    };

    const response = await axios.post(
      `${this.judge0BaseUrl}/submissions?base64_encoded=false&wait=true`,
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

    return response.data;
  }

  // Run all tests
  async runAllTests() {
    console.log('🎯 Multi-Test Executor Service Tests\n');
    console.log('═'.repeat(60));
    
    // Test 1: Code Generation
    this.testCodeGeneration();
    
    // Test 2: Batch Size Calculation
    this.testBatchSizeCalculation();
    
    // Test 3: Judge0 Execution (if API key available)
    if (this.apiKey) {
      await this.testJudge0Execution();
    } else {
      console.log('\n⚠️  Skipping Judge0 execution test (no API key)');
    }
    
    console.log('\n🏁 All tests completed!');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new MultiTestExecutorTester();
  tester.runAllTests().catch(console.error);
}

module.exports = MultiTestExecutorTester; 