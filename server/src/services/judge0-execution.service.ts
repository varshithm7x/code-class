import prisma from '../lib/prisma';
import { Judge0KeyManager } from './judge0-key-manager.service';
import { SimpleMultiTestService } from './simple-multi-test.service';
import { monitoringService } from './monitoring.service';

interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

interface Judge0ResultResponse {
  status: {
    id: number;
    description: string;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  time?: string;
  memory?: number;
  exit_code?: number;
}

// Language ID mapping for Judge0
const LANGUAGE_MAPPING: { [key: string]: number } = {
  'cpp': 54,     // C++ (GCC 9.2.0)
  'c': 50,       // C (GCC 9.2.0)
  'java': 62,    // Java (OpenJDK 13.0.1)
  'python': 71,  // Python (3.8.1)
  'javascript': 63 // JavaScript (Node.js 12.14.0)
};

export class Judge0ExecutionService {
  private readonly baseUrl: string;
  private readonly rapidApiKey: string;
  private userRateLimits = new Map<string, { count: number; resetTime: number }>();
  private multiTestExecutor: SimpleMultiTestService;

  constructor() {
    this.baseUrl = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
    this.rapidApiKey = process.env.RAPIDAPI_KEY || '';
    this.multiTestExecutor = new SimpleMultiTestService();
  }

  /**
   * Check if user can make a real-time execution request (rate limiting)
   */
  private canMakeRealTimeRequest(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId);

    if (!userLimit) {
      this.userRateLimits.set(userId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (now > userLimit.resetTime) {
      this.userRateLimits.set(userId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (userLimit.count < 5) {
      userLimit.count++;
      return true;
    }

    return false;
  }

  /**
   * Execute code in real-time for testing (with rate limiting)
   */
  async executeRealTime(
    userId: string,
    code: string,
    language: string,
    testCases: Array<{ input: string; expectedOutput: string }>,
    timeLimit: number = 2,
    memoryLimit: number = 128
  ): Promise<{ success: boolean; results?: any[]; rateLimited?: boolean; error?: string }> {
    try {
      // Check rate limit
      if (!this.canMakeRealTimeRequest(userId)) {
        return { 
          success: false, 
          rateLimited: true,
          error: 'Rate limit exceeded. Please wait before testing again.' 
        };
      }

      // Get available API key
      const keyData = await Judge0KeyManager.getAvailableKey();
      if (!keyData) {
        return { 
          success: false, 
          error: 'No available Judge0 API keys' 
        };
      }

      // Execute test cases (limit to first 3 for real-time)
      const limitedTestCases = testCases.slice(0, 3);
      const results = [];

      for (const testCase of limitedTestCases) {
        try {
          const result = await this.executeTestCase(
            code,
            language,
            testCase.input,
            testCase.expectedOutput,
            timeLimit,
            memoryLimit,
            keyData.key
          );

          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: result.stdout || '',
            status: result.status.description,
            time: parseFloat(result.time || '0'),
            memory: result.memory || 0,
            passed: result.status.id === 3
          });

        } catch (error) {
          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            status: 'Execution Error',
            time: 0,
            memory: 0,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { success: true, results };

    } catch (error) {
      console.error('Real-time execution error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Execution failed' 
      };
    }
  }

  /**
   * Execute a single test case
   */
  private async executeTestCase(
    code: string,
    language: string,
    input: string,
    expectedOutput: string,
    timeLimit: number,
    memoryLimit: number,
    apiKey: string
  ): Promise<Judge0ResultResponse> {
    const languageId = this.getLanguageId(language);
    
    const submissionRequest: Judge0SubmissionRequest = {
      source_code: code,
      language_id: languageId,
      stdin: input,
      expected_output: expectedOutput,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024 // Convert MB to KB
    };

    const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey
      },
      body: JSON.stringify(submissionRequest)
    });

    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Execute multiple test cases using simple Codeforces-style template
   */
  async executeMultiTestCases(
    userSolveFunction: string,
    testCases: Array<{ id: string; input: string; expectedOutput: string; isPublic?: boolean }>,
    timeLimit: number = 5,
    memoryLimit: number = 256,
    userId?: string
  ): Promise<{
    success: boolean;
    totalTestCases: number;
    passedTestCases: number;
    results: Array<{
      testCaseIndex: number;
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
      status: string;
    }>;
    executionTime: number;
    memoryUsed: number;
    error?: string;
    efficiencyGain?: number;
    apiCallsSaved?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Validate user's solve function
      const validation = this.multiTestExecutor.validateSolveFunction(userSolveFunction);
      if (!validation.valid) {
        throw new Error(`Invalid solve function: ${validation.errors.join(', ')}`);
      }

      // Get available API key
      const keyData = await Judge0KeyManager.getAvailableKey();
      if (!keyData) {
        throw new Error('No available Judge0 API keys');
      }

      // Generate multi-test code
      const multiTestCode = this.multiTestExecutor.generateCode(userSolveFunction);
      
      // Generate multi-test input
      const multiTestInput = this.multiTestExecutor.generateInput(testCases);
      
      // Execute with Judge0
      const result = await this.executeWithJudge0API(
        multiTestCode,
        multiTestInput,
        timeLimit,
        memoryLimit,
        keyData.key
      );

      // Parse results
      const parsedResults = this.multiTestExecutor.parseResults(result.stdout || '', testCases);
      const passedCount = parsedResults.filter(r => r.passed).length;
      const executionTime = Date.now() - startTime;

      // Calculate efficiency metrics
      const testCaseCount = testCases.length;
      const efficiencyGain = testCaseCount; // 1 API call vs testCaseCount API calls
      const apiCallsSaved = testCaseCount - 1; // Saved API calls

      // Track metrics for monitoring (Phase 4)
      if (userId) {
        await monitoringService.trackMultiTestExecution({
          userId,
          testCaseCount,
          executionTime,
          success: true,
          apiCallsSaved,
          efficiencyGain,
        });
      }

      return {
        success: true,
        totalTestCases: testCases.length,
        passedTestCases: passedCount,
        results: parsedResults,
        executionTime: parseFloat(result.time || '0'),
        memoryUsed: result.memory || 0,
        efficiencyGain,
        apiCallsSaved,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('Multi-test execution error:', error);

      // Track failed execution for monitoring
      if (userId) {
        await monitoringService.trackMultiTestExecution({
          userId,
          testCaseCount: testCases.length,
          executionTime,
          success: false,
          apiCallsSaved: 0,
          efficiencyGain: 0,
        });
      }

      return {
        success: false,
        totalTestCases: testCases.length,
        passedTestCases: 0,
        results: [],
        executionTime: 0,
        memoryUsed: 0,
        error: error instanceof Error ? error.message : 'Multi-test execution failed',
        efficiencyGain: 0,
        apiCallsSaved: 0,
      };
    }
  }

  /**
   * Execute code with Judge0 API - simplified version for multi-test
   */
  private async executeWithJudge0API(
    code: string,
    input: string,
    timeLimit: number,
    memoryLimit: number,
    apiKey: string
  ): Promise<Judge0ResultResponse> {
    const languageId = 54; // C++ (GCC 9.2.0)
    
    const submissionRequest: Judge0SubmissionRequest = {
      source_code: code,
      language_id: languageId,
      stdin: input,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024 // Convert MB to KB
    };

    const response = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey
      },
      body: JSON.stringify(submissionRequest)
    });

    if (!response.ok) {
      throw new Error(`Judge0 API error: ${response.status}`);
    }

    return await response.json();
  }

  private getLanguageId(language: string): number {
    return LANGUAGE_MAPPING[language] || 71; // Default to Python
  }

  // Placeholder methods for compatibility
  async queueForBatch(testId: string, submissionId: string): Promise<void> {
    console.log('Batch queuing not implemented yet');
  }

  async processPendingBatches(): Promise<void> {
    console.log('Batch processing not implemented yet');
  }

  getBatchStatus(): { testId: string; queueSize: number }[] {
    return [];
  }

  async processSubmission(submissionId: string): Promise<void> {
    console.log('Individual submission processing not implemented yet');
  }

  async executeTestRun(
    code: string,
    language: string,
    testCases: Array<{ input: string; expectedOutput: string }>,
    timeLimit: number = 2,
    memoryLimit: number = 128
  ): Promise<any> {
    // Simple wrapper around executeRealTime for now
    return this.executeRealTime('system', code, language, testCases, timeLimit, memoryLimit);
  }

  async queueSubmission(submissionId: string): Promise<void> {
    console.log('Submission queuing not implemented yet');
  }

  async processLargeTestSuite(
    testId: string, 
    submissions: Array<{
      code: string;
      language: string;
      problemId: string;
      testCases: any[];
    }>
  ): Promise<void> {
    console.log('Large test suite processing not implemented yet');
  }
} 