import prisma from '../lib/prisma';
import { Judge0KeyManager } from './judge0-key-manager.service';

interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

interface Judge0SubmissionResponse {
  token: string;
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
const LANGUAGE_MAPPING = {
  'cpp': 54,     // C++ (GCC 9.2.0)
  'c': 50,       // C (GCC 9.2.0)
  'java': 62,    // Java (OpenJDK 13.0.1)
  'python': 71,  // Python (3.8.1)
  'javascript': 63 // JavaScript (Node.js 12.14.0)
};

// Status mapping from Judge0 to our system
const STATUS_MAPPING: Record<number, string> = {
  1: 'PENDING',          // In Queue
  2: 'JUDGING',          // Processing
  3: 'ACCEPTED',         // Accepted
  4: 'WRONG_ANSWER',     // Wrong Answer
  5: 'TIME_LIMIT_EXCEEDED', // Time Limit Exceeded
  6: 'COMPILATION_ERROR', // Compilation Error
  7: 'RUNTIME_ERROR',    // Runtime Error (SIGSEGV)
  8: 'RUNTIME_ERROR',    // Runtime Error (SIGXFSZ)
  9: 'RUNTIME_ERROR',    // Runtime Error (SIGFPE)
  10: 'RUNTIME_ERROR',   // Runtime Error (SIGABRT)
  11: 'RUNTIME_ERROR',   // Runtime Error (NZEC)
  12: 'RUNTIME_ERROR',   // Runtime Error (Other)
  13: 'SYSTEM_ERROR',    // Internal Error
  14: 'SYSTEM_ERROR'     // Exec Format Error
};

export class Judge0ExecutionService {
  private readonly baseUrl: string;
  private readonly rapidApiKey: string;
  private userRateLimits = new Map<string, { count: number; resetTime: number }>(); // userId -> rate limit data
  private batchQueue = new Map<string, string[]>(); // testId -> array of submissionIds waiting for batch processing

  constructor() {
    this.baseUrl = process.env.JUDGE0_BASE_URL || 'https://judge0-ce.p.rapidapi.com';
    this.rapidApiKey = process.env.RAPIDAPI_KEY || '';
  }

  /**
   * Check if user can make a real-time execution request (rate limiting)
   */
  private canMakeRealTimeRequest(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId);

    if (!userLimit) {
      this.userRateLimits.set(userId, { count: 1, resetTime: now + 60000 }); // 1 minute window
      return true;
    }

    // Reset if window expired
    if (now > userLimit.resetTime) {
      this.userRateLimits.set(userId, { count: 1, resetTime: now + 60000 });
      return true;
    }

    // Check if within rate limit (5 requests per minute)
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

      // Execute test cases (limit to first 3 for real-time to save API calls)
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
            statusId: result.status.id,
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
            statusId: 13,
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
   * Queue submission for batch processing
   */
  async queueForBatch(testId: string, submissionId: string): Promise<void> {
    if (!this.batchQueue.has(testId)) {
      this.batchQueue.set(testId, []);
    }
    
    this.batchQueue.get(testId)!.push(submissionId);
    
    // Process batch if it reaches optimal size (10 submissions) or after timeout
    const queue = this.batchQueue.get(testId)!;
    if (queue.length >= 10) {
      await this.processBatch(testId);
    } else {
      // Set timeout to process batch even if not full
      setTimeout(() => {
        if (this.batchQueue.has(testId) && this.batchQueue.get(testId)!.length > 0) {
          this.processBatch(testId);
        }
      }, 30000); // 30 seconds timeout
    }
  }

  /**
   * Process a batch of submissions using Judge0's batch API
   */
  private async processBatch(testId: string): Promise<void> {
    const submissionIds = this.batchQueue.get(testId) || [];
    if (submissionIds.length === 0) return;

    // Clear the queue for this test
    this.batchQueue.delete(testId);

    try {
      console.log(`Processing batch of ${submissionIds.length} submissions for test ${testId}`);
      
      // Process submissions in parallel for better performance
      await Promise.all(
        submissionIds.map(submissionId => this.processSubmission(submissionId))
      );
      
      console.log(`Batch processing completed for test ${testId}`);
      
    } catch (error) {
      console.error('Batch processing error:', error);
      
      // If batch fails, process individually
      for (const submissionId of submissionIds) {
        try {
          await this.processSubmission(submissionId);
        } catch (individualError) {
          console.error(`Failed to process submission ${submissionId}:`, individualError);
        }
      }
    }
  }

  /**
   * Force process all pending batches (useful for test end)
   */
  async processPendingBatches(): Promise<void> {
    const testIds = Array.from(this.batchQueue.keys());
    await Promise.all(testIds.map(testId => this.processBatch(testId)));
  }

  /**
   * Get batch queue status
   */
  getBatchStatus(): { testId: string; queueSize: number }[] {
    return Array.from(this.batchQueue.entries()).map(([testId, queue]) => ({
      testId,
      queueSize: queue.length
    }));
  }

  /**
   * Process a test submission with Judge0
   */
  async processSubmission(submissionId: string): Promise<void> {
    try {
      // Get submission details
      const submission = await prisma.testSubmission.findUnique({
        where: { id: submissionId },
        include: {
          session: {
            include: {
              test: {
                include: {
                  problems: true
                }
              }
            }
          }
        }
      });

      if (!submission) {
        throw new Error('Submission not found');
      }

      const problem = submission.session.test.problems.find(
        (p: any) => p.id === submission.problemId
      );

      if (!problem) {
        throw new Error('Problem not found');
      }

      // Update submission status to processing
      await prisma.testSubmission.update({
        where: { id: submissionId },
        data: { status: 'JUDGING' }
      });

      // Get available API key
      const keyData = await Judge0KeyManager.getAvailableKey();
      if (!keyData) {
        throw new Error('No available Judge0 API keys');
      }

      // Process each test case (testCases is stored as JSON)
      const testCases = Array.isArray(problem.testCases) ? problem.testCases : JSON.parse(problem.testCases as string);
      const results: any[] = [];
      let totalScore = 0;
      let allPassed = true;

      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        try {
          const result = await this.executeTestCase(
            submission.code,
            submission.language,
            testCase.input,
            testCase.expectedOutput,
            problem.timeLimit,
            problem.memoryLimit,
            keyData.key
          );

          results.push({
            testCaseId: testCase.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: result.stdout || '',
            status: result.status.description,
            statusId: result.status.id,
            time: parseFloat(result.time || '0'),
            memory: result.memory || 0,
            passed: result.status.id === 3 // Accepted
          });

          if (result.status.id === 3) {
            totalScore += Math.floor(100 / testCases.length);
          } else {
            allPassed = false;
          }

        } catch (error) {
          console.error(`Error executing test case ${i + 1}:`, error);
          results.push({
            testCaseId: testCase.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            status: 'Internal Error',
            statusId: 13,
            time: 0,
            memory: 0,
            passed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          allPassed = false;
        }
      }

      // Calculate final status
      const finalStatus = allPassed ? 'ACCEPTED' : 
                         results.some(r => r.passed) ? 'WRONG_ANSWER' : 
                         results.some(r => r.statusId === 6) ? 'COMPILATION_ERROR' :
                         results.some(r => r.statusId === 5) ? 'TIME_LIMIT_EXCEEDED' :
                         'WRONG_ANSWER';

      // Update submission with results
      await prisma.testSubmission.update({
        where: { id: submissionId },
        data: {
          status: finalStatus,
          score: totalScore,
          executionTime: Math.max(...results.map(r => r.time)),
          memoryUsed: Math.max(...results.map(r => r.memory)),
          judgeOutput: {
            testCases: results,
            summary: {
              totalTestCases: testCases.length,
              passedTestCases: results.filter(r => r.passed).length,
              totalScore,
              allPassed
            }
          }
        }
      });

    } catch (error) {
      console.error('Error processing submission:', error);
      
      // Update submission with error status
      await prisma.testSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'SYSTEM_ERROR',
          score: 0,
          judgeOutput: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      });
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
    const languageId = LANGUAGE_MAPPING[language as keyof typeof LANGUAGE_MAPPING];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Submit to Judge0
    const submissionRequest: Judge0SubmissionRequest = {
      source_code: code,
      language_id: languageId,
      stdin: input,
      expected_output: expectedOutput.trim(),
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit * 1024 // Convert MB to KB
    };

    const submitResponse = await fetch(`${this.baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
        'X-RapidAPI-Key': apiKey
      },
      body: JSON.stringify(submissionRequest)
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Judge0 submission failed: ${errorText}`);
    }

    const result: Judge0ResultResponse = await submitResponse.json();
    return result;
  }

  /**
   * Get test run result (for immediate feedback without saving)
   */
  async executeTestRun(
    code: string,
    language: string,
    testCases: Array<{ input: string; expectedOutput: string }>,
    timeLimit: number = 2,
    memoryLimit: number = 128
  ): Promise<any> {
    try {
      // Get available API key
      const keyData = await Judge0KeyManager.getAvailableKey();
      if (!keyData) {
        throw new Error('No available Judge0 API keys');
      }

      const results = [];

      for (const testCase of testCases.slice(0, 3)) { // Limit to first 3 test cases for test runs
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
            passed: result.status.id === 3,
            time: parseFloat(result.time || '0'),
            memory: result.memory || 0,
            stderr: result.stderr || '',
            compileOutput: result.compile_output || ''
          });

        } catch (error) {
          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            status: 'Internal Error',
            passed: false,
            time: 0,
            memory: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        success: true,
        results,
        summary: {
          totalTestCases: results.length,
          passedTestCases: results.filter(r => r.passed).length
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Queue submission for background processing
   */
  async queueSubmission(submissionId: string): Promise<void> {
    // For now, process immediately
    // In production, you might want to use a proper queue like Bull/Agenda
    setImmediate(() => {
      this.processSubmission(submissionId).catch(console.error);
    });
  }
} 