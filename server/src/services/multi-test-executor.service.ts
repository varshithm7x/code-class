interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  explanation?: string;
}

interface MultiTestResult {
  success: boolean;
  totalTestCases: number;
  executedTestCases: number;
  results: TestCaseResult[];
  executionTime: number;
  memoryUsed: number;
  error?: string;
}

interface TestCaseResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
  passed: boolean;
  executionTime?: number;
}

export class MultiTestExecutorService {
  
  /**
   * Codeforces-style C++ template for multi-test execution
   */
  private readonly CPP_TEMPLATE = `
// ─────────────────────────────────────────────────────────────────────
//    Multi‑Test C++ Template for Judge0 Execution
// ─────────────────────────────────────────────────────────────────────
#include <bits/stdc++.h>
using namespace std;

// Fast I/O
static auto _ = [](){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    return nullptr;
}();

// User's solve function
{{USER_SOLVE_FUNCTION}}

int main(){
    int T;
    cin >> T;
    while(T--){
        solve();
    }
    return 0;
}
`.trim();

  /**
   * Generate multi-test input from test cases
   */
  private generateMultiTestInput(testCases: TestCase[]): string {
    const testCount = testCases.length;
    const inputs = testCases.map(tc => tc.input.trim()).join('\n');
    
    return `${testCount}\n${inputs}`;
  }

  /**
   * Generate expected output for comparison
   */
  private generateExpectedOutput(testCases: TestCase[]): string {
    return testCases.map(tc => tc.expectedOutput.trim()).join('\n');
  }

  /**
   * Extract user's solve function from their code
   */
  private extractSolveFunction(userCode: string): string {
    // Remove common includes and using statements that might conflict
    let cleanCode = userCode
      .replace(/#include\s*<[^>]+>/g, '') // Remove includes
      .replace(/using\s+namespace\s+std\s*;/g, '') // Remove using namespace
      .replace(/ios::sync_with_stdio\([^)]*\)\s*;?/g, '') // Remove fast I/O
      .replace(/cin\.tie\([^)]*\)\s*;?/g, '') // Remove cin.tie
      .trim();

    // If user provided a main function, extract logic and convert to solve()
    if (cleanCode.includes('int main')) {
      cleanCode = this.convertMainToSolve(cleanCode);
    }
    
    // If no solve function exists, wrap the code in a solve function
    if (!cleanCode.includes('void solve()') && !cleanCode.includes('void solve(')) {
      cleanCode = `void solve() {\n${cleanCode}\n}`;
    }

    return cleanCode;
  }

  /**
   * Convert main function logic to solve function
   */
  private convertMainToSolve(code: string): string {
    // Extract content between main() { and }
    const mainMatch = code.match(/int\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (!mainMatch) {
      return `void solve() {\n${code}\n}`;
    }

    let mainContent = mainMatch[1].trim();
    
    // Remove return statement
    mainContent = mainContent.replace(/return\s+\d+\s*;?\s*$/, '').trim();
    
    // Remove any test case loop if it exists (T, while(T--), etc.)
    mainContent = mainContent
      .replace(/int\s+[Tt]\s*;?\s*cin\s*>>\s*[Tt]\s*;?/g, '')
      .replace(/while\s*\(\s*[Tt]--\s*\)\s*\{?/g, '')
      .replace(/for\s*\([^)]*[Tt][^)]*\)\s*\{?/g, '');

    // Remove extra closing braces
    const openBraces = (mainContent.match(/\{/g) || []).length;
    const closeBraces = (mainContent.match(/\}/g) || []).length;
    if (closeBraces > openBraces) {
      mainContent = mainContent.replace(/\}$/, '').trim();
    }

    return `void solve() {\n${mainContent}\n}`;
  }

  /**
   * Generate complete C++ code with embedded test cases
   */
  generateMultiTestCode(userCode: string, testCases: TestCase[]): string {
    const solveFunction = this.extractSolveFunction(userCode);
    return this.CPP_TEMPLATE.replace('{{USER_SOLVE_FUNCTION}}', solveFunction);
  }

  /**
   * Parse Judge0 output to extract individual test case results
   */
  parseMultiTestOutput(
    judge0Output: string, 
    testCases: TestCase[]
  ): TestCaseResult[] {
    const results: TestCaseResult[] = [];
    const actualOutputLines = judge0Output.trim().split('\n');
    const expectedOutputLines = this.generateExpectedOutput(testCases).split('\n');

    // Match actual outputs with expected outputs line by line
    for (let i = 0; i < testCases.length; i++) {
      const actualOutput = actualOutputLines[i] || '';
      const expectedOutput = expectedOutputLines[i] || '';
      const passed = actualOutput.trim() === expectedOutput.trim();

      results.push({
        index: i,
        input: testCases[i].input,
        expectedOutput: expectedOutput,
        actualOutput: actualOutput,
        status: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
        passed: passed
      });
    }

    return results;
  }

  /**
   * Calculate optimal batch size based on time constraints
   */
  calculateOptimalBatchSize(
    testCases: TestCase[], 
    timeLimit: number = 5 // Judge0 default time limit in seconds
  ): number {
    // Conservative estimate: 0.1 seconds per test case for complex problems
    // This leaves buffer for I/O, compilation, and safety margin
    const estimatedTimePerTest = 0.1;
    const maxTestCasesPerBatch = Math.floor(timeLimit / estimatedTimePerTest);
    
    // Cap at reasonable limits
    const minBatch = Math.min(10, testCases.length);
    const maxBatch = Math.min(50, testCases.length);
    
    return Math.max(minBatch, Math.min(maxTestCasesPerBatch, maxBatch));
  }

  /**
   * Split test cases into optimal batches
   */
  createTestBatches(testCases: TestCase[], batchSize?: number): TestCase[][] {
    const optimalBatchSize = batchSize || this.calculateOptimalBatchSize(testCases);
    const batches: TestCase[][] = [];
    
    for (let i = 0; i < testCases.length; i += optimalBatchSize) {
      batches.push(testCases.slice(i, i + optimalBatchSize));
    }
    
    return batches;
  }

  /**
   * Validate generated code for common issues
   */
  validateGeneratedCode(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required components
    if (!code.includes('void solve()')) {
      errors.push('Missing solve() function');
    }
    
    if (!code.includes('int main()')) {
      errors.push('Missing main() function');
    }
    
    if (!code.includes('cin >> T')) {
      errors.push('Missing test case count input');
    }
    
    if (!code.includes('while(T--)')) {
      errors.push('Missing test case loop');
    }

    // Check for problematic patterns
    if (code.includes('system(') || code.includes('exec(')) {
      errors.push('System calls not allowed');
    }
    
    if (code.match(/while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/)) {
      errors.push('Infinite loops detected');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
} 