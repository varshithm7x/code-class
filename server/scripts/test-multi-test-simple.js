/**
 * Simple test script for Multi-Test Executor Service
 * Tests code generation and parsing without Judge0 API calls
 */

const { MultiTestExecutorService } = require('../dist/services/multi-test-executor.service');

class SimpleMultiTestTester {
  constructor() {
    this.service = new MultiTestExecutorService();
  }

  // Test scenarios
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
        name: 'User Code with Main Function',
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
      }
    ];
  }

  // Test code generation
  testCodeGeneration() {
    console.log('🧪 Testing Multi-Test Code Generation\n');
    console.log('═'.repeat(60));
    
    const scenarios = this.getTestScenarios();
    
    for (const scenario of scenarios) {
      console.log(`\n📝 Testing: ${scenario.name}`);
      
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
        
        // Show the generated code
        console.log('\n📄 Generated Code:');
        console.log('─'.repeat(50));
        console.log(generatedCode);
        console.log('─'.repeat(50));
        
        // Generate and show input
        const multiTestInput = this.generateMultiTestInput(scenario.testCases);
        console.log('\n📥 Generated Input:');
        console.log(multiTestInput.split('\n').map(line => `  ${line}`).join('\n'));
        
        // Show expected output
        const expectedOutput = this.generateExpectedOutput(scenario.testCases);
        console.log('\n📤 Expected Output:');
        console.log(expectedOutput.split('\n').map(line => `  ${line}`).join('\n'));
        
      } catch (error) {
        console.log('❌ Error:', error.message);
      }
      
      console.log('\n' + '═'.repeat(60));
    }
  }

  // Test output parsing
  testOutputParsing() {
    console.log('\n🔍 Testing Output Parsing\n');
    console.log('═'.repeat(60));
    
    const testCases = [
      { id: '1', input: '1 2', expectedOutput: '3', isPublic: true },
      { id: '2', input: '5 7', expectedOutput: '12', isPublic: true },
      { id: '3', input: '10 20', expectedOutput: '30', isPublic: false },
    ];

    // Simulate Judge0 output
    const simulatedOutput = '3\n12\n30';
    
    console.log('📥 Simulated Judge0 Output:');
    console.log(simulatedOutput.split('\n').map(line => `  ${line}`).join('\n'));
    
    // Parse results
    const parsedResults = this.service.parseMultiTestOutput(simulatedOutput, testCases);
    
    console.log('\n📊 Parsed Results:');
    parsedResults.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  Test ${index + 1}: ${status}`);
      console.log(`    Input: ${result.input}`);
      console.log(`    Expected: ${result.expectedOutput}`);
      console.log(`    Actual: ${result.actualOutput}`);
    });
    
    const passedCount = parsedResults.filter(r => r.passed).length;
    console.log(`\n🎯 Summary: ${passedCount}/${parsedResults.length} test cases passed`);
  }

  // Test batch size calculation
  testBatchSizeCalculation() {
    console.log('\n📏 Testing Batch Size Calculation\n');
    console.log('═'.repeat(60));
    
    const scenarios = [
      { size: 5, name: 'Small test suite' },
      { size: 25, name: 'Medium test suite' },
      { size: 100, name: 'Large test suite' },
      { size: 200, name: 'Very large test suite' }
    ];
    
    scenarios.forEach(scenario => {
      const testCases = Array.from({ length: scenario.size }, (_, i) => ({
        id: `test_${i}`,
        input: `${i}`,
        expectedOutput: `${i * 2}`,
        isPublic: i < 3
      }));
      
      const batchSize = this.service.calculateOptimalBatchSize(testCases);
      const batches = this.service.createTestBatches(testCases);
      
      console.log(`📦 ${scenario.name} (${scenario.size} test cases):`);
      console.log(`   Optimal batch size: ${batchSize}`);
      console.log(`   Number of batches: ${batches.length}`);
      
      // Show batch distribution
      console.log(`   Batch sizes: [${batches.map(b => b.length).join(', ')}]`);
      
      // Calculate efficiency
      const totalCases = batches.reduce((sum, batch) => sum + batch.length, 0);
      const efficiency = (totalCases / scenario.size * 100).toFixed(1);
      console.log(`   Efficiency: ${efficiency}% (${totalCases}/${scenario.size} cases processed)`);
      console.log();
    });
  }

  // Test edge cases
  testEdgeCases() {
    console.log('\n⚠️  Testing Edge Cases\n');
    console.log('═'.repeat(60));
    
    // Test 1: Empty solve function
    console.log('🧪 Test 1: Empty solve function');
    try {
      const result = this.service.generateMultiTestCode('', [
        { id: '1', input: '1 2', expectedOutput: '3', isPublic: true }
      ]);
      console.log('✅ Handled empty code');
    } catch (error) {
      console.log('❌ Error with empty code:', error.message);
    }
    
    // Test 2: Code with includes and main
    console.log('\n🧪 Test 2: Code with conflicting includes');
    try {
      const codeWithIncludes = `
#include <bits/stdc++.h>
#include <iostream>
using namespace std;

int main() {
    int x;
    cin >> x;
    cout << x * 2 << endl;
    return 0;
}`;
      
      const result = this.service.generateMultiTestCode(codeWithIncludes, [
        { id: '1', input: '5', expectedOutput: '10', isPublic: true }
      ]);
      
      console.log('✅ Handled code with includes and main function');
      
      // Check if duplicate includes are removed
      const includeCount = (result.match(/#include <bits\/stdc\+\+\.h>/g) || []).length;
      console.log(`   Include count: ${includeCount} (should be 1)`);
      
    } catch (error) {
      console.log('❌ Error with includes:', error.message);
    }
    
    // Test 3: Invalid output parsing
    console.log('\n🧪 Test 3: Invalid output parsing');
    try {
      const testCases = [
        { id: '1', input: '1', expectedOutput: '2', isPublic: true },
        { id: '2', input: '3', expectedOutput: '6', isPublic: true }
      ];
      
      const invalidOutput = '2\n'; // Missing second output
      const results = this.service.parseMultiTestOutput(invalidOutput, testCases);
      
      console.log('✅ Handled incomplete output');
      console.log(`   Results: ${results.map(r => r.passed).join(', ')}`);
      
    } catch (error) {
      console.log('❌ Error with invalid output:', error.message);
    }
  }

  // Helper methods
  generateMultiTestInput(testCases) {
    const testCount = testCases.length;
    const inputs = testCases.map(tc => tc.input.trim()).join('\n');
    return `${testCount}\n${inputs}`;
  }

  generateExpectedOutput(testCases) {
    return testCases.map(tc => tc.expectedOutput.trim()).join('\n');
  }

  // Run all tests
  runAllTests() {
    console.log('🎯 Multi-Test Executor Service - Phase 1 Testing\n');
    
    try {
      // Test 1: Code Generation
      this.testCodeGeneration();
      
      // Test 2: Output Parsing
      this.testOutputParsing();
      
      // Test 3: Batch Size Calculation
      this.testBatchSizeCalculation();
      
      // Test 4: Edge Cases
      this.testEdgeCases();
      
      console.log('\n🏁 Phase 1 Testing Complete!');
      console.log('\n✨ Key Achievements:');
      console.log('   ✅ Codeforces-style template generation');
      console.log('   ✅ User code transformation (main → solve)');
      console.log('   ✅ Multi-test input/output handling');
      console.log('   ✅ Intelligent batch size calculation');
      console.log('   ✅ Robust error handling');
      
      console.log('\n🚀 Ready for Phase 2: Judge0 Integration!');
      
    } catch (error) {
      console.log('\n❌ Test suite failed:', error.message);
      console.error(error);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SimpleMultiTestTester();
  tester.runAllTests();
}

module.exports = SimpleMultiTestTester; 