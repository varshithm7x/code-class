/**
 * Batch Division Algorithm Service
 * 
 * Based on extensive testing of Judge0 RapidAPI configurable limits:
 * - Maximum CPU time limit: 20 seconds
 * - Maximum wall time limit: 30 seconds  
 * - Uses 75% safety margin for production reliability
 * - Uses wall_time_limit as it's more generous than cpu_time_limit
 * 
 * Updated Test Results with configurable limits:
 * - Easy problems (0.5s): Max 45, Safe 33 test cases per batch
 * - Medium problems (1.0s): Max 22, Safe 16 test cases per batch
 * - Hard problems (2.0s): Max 11, Safe 8 test cases per batch
 * 
 * This represents a ~2.3x improvement over previous 9-second limit!
 */

export interface BatchConfiguration {
  maxTestCasesPerBatch: number;
  maxTotalTimePerBatch: number;
  safetyMargin: number;
  estimatedTimePerTestCase: number;
}

export interface BatchDivisionResult {
  batches: TestCaseBatch[];
  totalBatches: number;
  configuration: BatchConfiguration;
  estimatedTotalTime: number;
}

export interface TestCaseBatch {
  batchId: number;
  testCases: any[];
  estimatedExecutionTime: number;
  testCaseCount: number;
}

export class BatchDivisionAlgorithmService {
  // Constants based on Judge0 RapidAPI configurable limits testing
  private static readonly MAX_EXECUTION_TIME = 30; // seconds (wall_time_limit)
  private static readonly SAFETY_MARGIN = 0.75; // 75% of maximum for reliability  
  private static readonly SAFE_MAX_TIME = 22.5; // 30 * 0.75
  
  // Problem difficulty configurations based on LeetCode standards
  // Updated with new 30s wall_time_limit and 75% safety margin
  private static readonly PROBLEM_CONFIGS = {
    EASY: {
      timePerTestCase: 0.5,
      maxTestCases: 45, // 22.5s / 0.5s = 45 test cases (was 14)
      description: 'Array, string, basic algorithms'
    },
    MEDIUM: {
      timePerTestCase: 1.0,
      maxTestCases: 22, // 22.5s / 1.0s = 22 test cases (was 7)
      description: 'Standard LeetCode problems'
    },
    HARD: {
      timePerTestCase: 2.0,
      maxTestCases: 11, // 22.5s / 2.0s = 11 test cases (was 3)
      description: 'Complex algorithms, advanced data structures'
    }
  };

  /**
   * Automatically determine problem difficulty based on time limit
   */
  static determineProblemDifficulty(timeLimitSeconds: number): keyof typeof BatchDivisionAlgorithmService.PROBLEM_CONFIGS {
    if (timeLimitSeconds <= 0.5) return 'EASY';
    if (timeLimitSeconds <= 1.0) return 'MEDIUM';
    return 'HARD';
  }

  /**
   * Calculate optimal batch configuration for given time limit
   */
  static calculateBatchConfiguration(timeLimitSeconds: number) {
    // Calculate safe limits based on actual time per test case
    const safeMaxTime = this.SAFE_MAX_TIME;
    const maxTestCasesForTime = Math.floor(safeMaxTime / timeLimitSeconds);
    
    // Determine recommended limit based on problem difficulty
    let recommendedLimit = 22; // Default for 1s problems (updated from 7)
    if (timeLimitSeconds <= 0.5) recommendedLimit = 45; // Updated from 14
    else if (timeLimitSeconds >= 2.0) recommendedLimit = 11; // Updated from 3
    
    // Use the more conservative limit
    const maxTestCasesPerBatch = Math.min(recommendedLimit, maxTestCasesForTime);
    
    return {
      maxTestCasesPerBatch,
      maxTotalTimePerBatch: maxTestCasesPerBatch * timeLimitSeconds,
      safetyMargin: this.SAFETY_MARGIN,
      estimatedTimePerTestCase: timeLimitSeconds
    };
  }

  /**
   * Divide test cases into optimal batches
   */
  static divideTestCasesIntoBatches(testCases: any[], timeLimitSeconds: number = 1.0) {
    const config = this.calculateBatchConfiguration(timeLimitSeconds);
    const batches = [];
    
    // Divide test cases into batches
    for (let i = 0; i < testCases.length; i += config.maxTestCasesPerBatch) {
      const batchTestCases = testCases.slice(i, i + config.maxTestCasesPerBatch);
      
      batches.push({
        batchId: batches.length + 1,
        testCases: batchTestCases,
        estimatedExecutionTime: batchTestCases.length * timeLimitSeconds,
        testCaseCount: batchTestCases.length
      });
    }
    
    const estimatedTotalTime = batches.reduce((total, batch) => total + batch.estimatedExecutionTime, 0);
    
    return {
      batches,
      totalBatches: batches.length,
      configuration: config,
      estimatedTotalTime
    };
  }

  /**
   * Validate if batch configuration is safe
   */
  static validateBatchConfiguration(
    testCaseCount: number, 
    timeLimitSeconds: number
  ): { isValid: boolean; reason?: string; recommendation?: string } {
    const totalTime = testCaseCount * timeLimitSeconds;
    
    // Check if total time exceeds safe limit
    if (totalTime > this.SAFE_MAX_TIME) {
      const maxSafeTestCases = Math.floor(this.SAFE_MAX_TIME / timeLimitSeconds);
      return {
        isValid: false,
        reason: `Total execution time (${totalTime}s) exceeds safe limit (${this.SAFE_MAX_TIME}s)`,
        recommendation: `Reduce to ${maxSafeTestCases} test cases or split into multiple batches`
      };
    }
    
    // Check if test case count exceeds recommended limits
    const config = this.calculateBatchConfiguration(timeLimitSeconds);
    if (testCaseCount > config.maxTestCasesPerBatch) {
      return {
        isValid: false,
        reason: `Test case count (${testCaseCount}) exceeds recommended limit (${config.maxTestCasesPerBatch})`,
        recommendation: `Split into batches of ${config.maxTestCasesPerBatch} test cases each`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Calculate efficiency gains from batching
   */
  static calculateEfficiencyGains(totalTestCases: number, timeLimitSeconds: number) {
    const result = this.divideTestCasesIntoBatches(
      Array.from({ length: totalTestCases }, (_, i) => ({ id: i + 1 })), 
      timeLimitSeconds
    );
    
    const traditionalApiCalls = totalTestCases;
    const batchedApiCalls = result.totalBatches;
    const efficiencyGain = traditionalApiCalls / batchedApiCalls;
    const apiQuotaSaved = ((traditionalApiCalls - batchedApiCalls) / traditionalApiCalls) * 100;
    
    return {
      traditionalApiCalls,
      batchedApiCalls,
      efficiencyGain: Math.round(efficiencyGain * 10) / 10,
      apiQuotaSaved: Math.round(apiQuotaSaved * 10) / 10
    };
  }

  /**
   * Get optimal batch size for common LeetCode problem types
   */
  static getOptimalBatchSizes(): Record<string, { batchSize: number; timeLimit: number; description: string }> {
    return {
      'array-easy': {
        batchSize: this.PROBLEM_CONFIGS.EASY.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.EASY.timePerTestCase,
        description: 'Array manipulation, two pointers, sliding window'
      },
      'string-easy': {
        batchSize: this.PROBLEM_CONFIGS.EASY.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.EASY.timePerTestCase,
        description: 'String processing, palindromes, anagrams'
      },
      'tree-medium': {
        batchSize: this.PROBLEM_CONFIGS.MEDIUM.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.MEDIUM.timePerTestCase,
        description: 'Binary trees, BST, tree traversal'
      },
      'graph-medium': {
        batchSize: this.PROBLEM_CONFIGS.MEDIUM.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.MEDIUM.timePerTestCase,
        description: 'BFS, DFS, shortest path'
      },
      'dp-hard': {
        batchSize: this.PROBLEM_CONFIGS.HARD.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.HARD.timePerTestCase,
        description: 'Dynamic programming, optimization'
      },
      'advanced-hard': {
        batchSize: this.PROBLEM_CONFIGS.HARD.maxTestCases,
        timeLimit: this.PROBLEM_CONFIGS.HARD.timePerTestCase,
        description: 'Advanced algorithms, complex data structures'
      }
    };
  }

  /**
   * Generate batch execution plan with detailed analysis
   */
  static generateExecutionPlan(
    testCases: any[], 
    timeLimitSeconds: number,
    problemType?: string
  ): {
    plan: BatchDivisionResult;
    validation: ReturnType<typeof BatchDivisionAlgorithmService.validateBatchConfiguration>;
    efficiency: ReturnType<typeof BatchDivisionAlgorithmService.calculateEfficiencyGains>;
    summary: {
      totalTestCases: number;
      totalBatches: number;
      averageTestCasesPerBatch: number;
      maxExecutionTimePerBatch: number;
      totalEstimatedTime: number;
      problemDifficulty: string;
    };
  } {
    const plan = this.divideTestCasesIntoBatches(testCases, timeLimitSeconds);
    const validation = this.validateBatchConfiguration(testCases.length, timeLimitSeconds);
    const efficiency = this.calculateEfficiencyGains(testCases.length, timeLimitSeconds);
    
    const difficulty = this.determineProblemDifficulty(timeLimitSeconds);
    const averageTestCasesPerBatch = Math.round(testCases.length / plan.totalBatches);
    const maxExecutionTimePerBatch = Math.max(...plan.batches.map(b => b.estimatedExecutionTime));
    
    return {
      plan,
      validation,
      efficiency,
      summary: {
        totalTestCases: testCases.length,
        totalBatches: plan.totalBatches,
        averageTestCasesPerBatch,
        maxExecutionTimePerBatch,
        totalEstimatedTime: plan.estimatedTotalTime,
        problemDifficulty: difficulty
      }
    };
  }
} 