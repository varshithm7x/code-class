/**
 * Simple Multi-Test Executor Service
 * 
 * Implements efficient multi-test case execution using Codeforces-style templates.
 * Follows KISS principle - simple string replacement, no overengineering.
 */

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic?: boolean;
}

interface MultiTestResult {
  testCaseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  status: 'ACCEPTED' | 'WRONG_ANSWER';
}

interface MultiTestExecution {
  success: boolean;
  totalTestCases: number;
  passedTestCases: number;
  results: MultiTestResult[];
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

export class SimpleMultiTestService {
  
  /**
   * Codeforces-style C++ template
   * Simple string replacement - no complex transformation needed
   */
  private readonly CPP_TEMPLATE = `#include <bits/stdc++.h>
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

  /**
   * Generate complete C++ code by inserting user's solve function
   * KISS: Simple string replacement, no parsing or transformation
   */
  generateCode(userSolveFunction: string): string {
    return this.CPP_TEMPLATE.replace('{{USER_SOLVE_FUNCTION}}', userSolveFunction.trim());
  }

  /**
   * Generate multi-test input format
   * Format: test_count\ninput1\ninput2\n...
   */
  generateInput(testCases: TestCase[]): string {
    const testCount = testCases.length;
    const inputs = testCases.map(tc => tc.input.trim()).join('\n');
    return `${testCount}\n${inputs}`;
  }

  /**
   * Parse Judge0 output and map to individual test case results
   * Assumes output format: result1\nresult2\n...
   */
  parseResults(judge0Output: string, testCases: TestCase[]): MultiTestResult[] {
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

  /**
   * Calculate optimal batch size for test cases
   * Conservative approach: assume 0.1s per test case, leave buffer for safety
   */
  calculateBatchSize(testCases: TestCase[], timeLimit: number = 5): number {
    const estimatedTimePerTest = 0.1; // Conservative estimate
    const maxTestCasesForTime = Math.floor(timeLimit / estimatedTimePerTest);
    
    // Conservative limits: min 5, max 50 test cases per batch
    const minBatch = Math.min(5, testCases.length);
    const maxBatch = Math.min(50, testCases.length);
    
    return Math.max(minBatch, Math.min(maxTestCasesForTime, maxBatch));
  }

  /**
   * Split large test suites into batches
   * Returns array of test case arrays, each representing a batch
   */
  createBatches(testCases: TestCase[], batchSize?: number): TestCase[][] {
    const optimalBatchSize = batchSize || this.calculateBatchSize(testCases);
    const batches: TestCase[][] = [];
    
    for (let i = 0; i < testCases.length; i += optimalBatchSize) {
      batches.push(testCases.slice(i, i + optimalBatchSize));
    }
    
    return batches;
  }

  /**
   * Validate user's solve function for basic correctness
   * Simple checks - not overengineered
   */
  validateSolveFunction(solveFunction: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!solveFunction.trim()) {
      errors.push('Solve function cannot be empty');
    }
    
    if (!solveFunction.includes('void solve()')) {
      errors.push('Must contain "void solve()" function declaration');
    }
    
    // Check for dangerous patterns
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

  /**
   * Create execution summary from multiple batch results
   */
  createExecutionSummary(batchResults: MultiTestExecution[]): MultiTestExecution {
    const allResults: MultiTestResult[] = [];
    let totalExecutionTime = 0;
    let maxMemoryUsed = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    for (const batch of batchResults) {
      if (!batch.success) {
        hasErrors = true;
        errorMessage = batch.error || 'Batch execution failed';
        break;
      }
      
      allResults.push(...batch.results);
      totalExecutionTime += batch.executionTime;
      maxMemoryUsed = Math.max(maxMemoryUsed, batch.memoryUsed);
    }
    
    const passedTestCases = allResults.filter(r => r.passed).length;
    
    return {
      success: !hasErrors,
      totalTestCases: allResults.length,
      passedTestCases: passedTestCases,
      results: allResults,
      executionTime: totalExecutionTime,
      memoryUsed: maxMemoryUsed,
      error: hasErrors ? errorMessage : undefined
    };
  }
} 