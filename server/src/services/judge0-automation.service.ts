import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { AWSInfrastructureService, EC2LaunchConfig } from './aws-infrastructure.service';

const prisma = new PrismaClient() as any;

export interface TestSchedule {
  testId: string;
  studentCount: number;
  durationMinutes: number;
  problems: any[];
  startTime: Date;
}

export interface QuickTestSubmission {
  testId: string;
  studentId: string;
  problemId: string;
  sourceCode: string;
  languageId: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

export interface FinalSubmission {
  testId: string;
  studentId: string;
  problemId: string;
  sourceCode: string;
  languageId: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
}

export interface ExecutionResult {
  success: boolean;
  passedTests: number;
  totalTests: number;
  score: number;
  details: any[];
  executionTime?: number;
  memoryUsed?: number;
}

export class Judge0AutomationService {
  private awsService = new AWSInfrastructureService();
  
  /**
   * Schedule and launch automated Judge0 instance for a test
   */
  async scheduleTest(testDetails: TestSchedule): Promise<string> {
    try {
      console.log(`Scheduling test ${testDetails.testId} for ${testDetails.studentCount} students`);
      
      // 1. Validate test configuration
      const validation = await this.validateTestConfig(testDetails);
      if (!validation.isValid) {
        throw new Error(`Test validation failed: ${validation.errors.join(', ')}`);
      }
      
      // 2. Launch EC2 instance with Judge0
      const launchConfig: EC2LaunchConfig = {
        testId: testDetails.testId,
        expectedStudents: testDetails.studentCount,
        durationMinutes: testDetails.durationMinutes,
        problems: testDetails.problems
      };
      
      const launchResult = await this.awsService.launchJudge0Instance(launchConfig);
      
      // 3. Monitor setup progress
      const instanceReady = await this.waitForInstanceReady(launchResult.instanceId);
      
      if (!instanceReady) {
        throw new Error('Judge0 instance failed to become ready within timeout');
      }
      
      // 4. Update instance status to READY
      await prisma.judge0Instance.update({
        where: { instanceId: launchResult.instanceId },
        data: {
          status: 'READY',
          readyAt: new Date()
        }
      });
      
      console.log(`Test ${testDetails.testId} scheduled successfully. Judge0 URL: ${launchResult.judgeUrl}`);
      return launchResult.judgeUrl;
      
    } catch (error) {
      console.error('Failed to schedule test:', error);
      throw error;
    }
  }
  
  /**
   * Run quick test during exam (1-3 test cases for immediate feedback)
   */
  async runQuickTest(submission: QuickTestSubmission): Promise<ExecutionResult> {
    try {
      const instance = await this.getJudge0Instance(submission.testId);
      if (!instance || instance.status !== 'READY') {
        throw new Error('Judge0 instance not ready for this test');
      }
      
      // Run only first 3 test cases for quick feedback
      const quickTests = submission.testCases.slice(0, 3);
      
      const batchSubmission = {
        submissions: quickTests.map(testCase => ({
          source_code: submission.sourceCode,
          language_id: submission.languageId,
          stdin: testCase.input,
          expected_output: testCase.expectedOutput,
          cpu_time_limit: 1,
          memory_limit: 128000
        }))
      };
      
      const result = await this.submitBatch(instance.judgeUrl, batchSubmission);
      return this.formatQuickTestResult(result);
      
    } catch (error) {
      console.error('Quick test execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Run final submission with all test cases (100+ test cases)
   */
  async runFinalSubmission(submission: FinalSubmission): Promise<ExecutionResult> {
    try {
      const instance = await this.getJudge0Instance(submission.testId);
      if (!instance) {
        throw new Error('Judge0 instance not found for this test');
      }
      
      // Update instance status to ACTIVE during final processing
      await prisma.judge0Instance.update({
        where: { id: instance.id },
        data: { 
          status: 'ACTIVE',
          submissionsCount: { increment: 1 }
        }
      });
      
      // Process all test cases in batches
      const allTestCases = submission.testCases;
      const batches = this.chunkArray(allTestCases, 20); // Judge0 batch limit
      const results = [];
      
      for (const batch of batches) {
        const batchSubmission = {
          submissions: batch.map(testCase => ({
            source_code: submission.sourceCode,
            language_id: submission.languageId,
            stdin: testCase.input,
            expected_output: testCase.expectedOutput,
            cpu_time_limit: 2,
            memory_limit: 256000
          }))
        };
        
        const batchResult = await this.submitBatch(instance.judgeUrl, batchSubmission);
        results.push(...batchResult);
        
        // Small delay between batches to prevent overload
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Update test case execution count
      await prisma.judge0Instance.update({
        where: { id: instance.id },
        data: { testCasesExecuted: { increment: allTestCases.length } }
      });
      
      return this.calculateFinalScore(results);
      
    } catch (error) {
      console.error('Final submission execution failed:', error);
      throw error;
    }
  }
  
  /**
   * Monitor test completion and trigger shutdown
   */
  async monitorTestProgress(testId: string): Promise<void> {
    try {
      const testSession = await this.getTestSession(testId);
      if (!testSession) return;
      
      while (!testSession.completed) {
        const progress = await this.checkTestProgress(testId);
        
        if (progress.allStudentsSubmitted && progress.allResultsProcessed) {
          await this.initiateShutdown(testSession.instanceId);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 60000)); // Check every minute
      }
    } catch (error) {
      console.error('Test monitoring failed:', error);
    }
  }
  
  /**
   * Initiate instance shutdown after test completion
   */
  private async initiateShutdown(instanceId: string): Promise<void> {
    try {
      console.log(`Initiating shutdown for instance: ${instanceId}`);
      
      // Update instance status
      await prisma.judge0Instance.update({
        where: { instanceId },
        data: { status: 'SHUTTING_DOWN' }
      });
      
      // Wait for any pending submissions
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Calculate final costs
      const instance = await prisma.judge0Instance.findUnique({
        where: { instanceId }
      });
      
      if (instance) {
        const cost = this.awsService.calculateInstanceCost(
          instance.launchedAt,
          new Date()
        );
        
        await prisma.judge0Instance.update({
          where: { instanceId },
          data: { cost }
        });
      }
      
      // Terminate EC2 instance
      await this.awsService.terminateInstance(instanceId);
      
      console.log(`Instance ${instanceId} shutdown completed`);
      
    } catch (error) {
      console.error('Shutdown failed:', error);
      throw error;
    }
  }
  
  /**
   * Validate test configuration before launch
   */
  private async validateTestConfig(testDetails: TestSchedule): Promise<{isValid: boolean, errors: string[]}> {
    const errors: string[] = [];
    
    if (testDetails.studentCount <= 0) {
      errors.push('Student count must be greater than 0');
    }
    
    if (testDetails.durationMinutes <= 0) {
      errors.push('Duration must be greater than 0 minutes');
    }
    
    if (!testDetails.problems || testDetails.problems.length === 0) {
      errors.push('At least one problem is required');
    }
    
    // Check if test already has an active instance
    const existingInstance = await prisma.judge0Instance.findUnique({
      where: { testId: testDetails.testId }
    });
    
    if (existingInstance && existingInstance.status !== 'TERMINATED') {
      errors.push('Test already has an active Judge0 instance');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * Wait for instance to become ready
   */
  private async waitForInstanceReady(instanceId: string): Promise<boolean> {
    const maxWaitTime = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const instance = await prisma.judge0Instance.findUnique({
          where: { instanceId }
        });
        
        if (instance?.status === 'READY') {
          return true;
        }
        
        if (instance?.status === 'FAILED') {
          return false;
        }
        
        // Check Judge0 health directly
        const healthCheck = await this.checkJudge0Health(instance?.judgeUrl);
        if (healthCheck) {
          await prisma.judge0Instance.update({
            where: { instanceId },
            data: { 
              status: 'READY',
              readyAt: new Date()
            }
          });
          return true;
        }
        
      } catch (error: any) {
        console.log('Waiting for instance to be ready...', error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    }
    
    return false;
  }
  
  /**
   * Check Judge0 health with comprehensive validation
   */
  private async checkJudge0Health(judgeUrl?: string): Promise<boolean> {
    if (!judgeUrl) return false;
    
    try {
      // Test basic connectivity
      const response = await axios.get(`${judgeUrl}/languages`, { timeout: 10000 });
      if (response.status !== 200) return false;
      
      // Test that essential languages are available
      const languages = response.data as any[];
      const hasEssentialLanguages = languages.some((lang: any) => [54, 71, 62].includes(lang.id)); // C++, Python, Java
      
      if (!hasEssentialLanguages) {
        console.warn('Judge0 health check: Essential languages not found');
        return false;
      }
      
      // Test simple execution
      const testSubmission = {
        source_code: 'print("health_check")',
        language_id: 71, // Python
        stdin: ''
      };
      
      const testResponse = await axios.post(`${judgeUrl}/submissions?wait=true`, testSubmission, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const isExecutionHealthy = (testResponse.data as any).status?.description === 'Accepted';
      
      if (!isExecutionHealthy) {
        console.warn('Judge0 health check: Code execution test failed');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Judge0 health check failed:', error);
      return false;
    }
  }
  
  /**
   * Submit batch to Judge0
   */
  private async submitBatch(judgeUrl: string, batchSubmission: any): Promise<any[]> {
    const response = await axios.post(
      `${judgeUrl}/submissions/batch`,
      batchSubmission,
      { timeout: 30000 }
    );
    
    // Wait for all submissions to complete
    const tokens = (response.data as any[]).map((sub: any) => sub.token);
    return await this.waitForCompletion(judgeUrl, tokens);
  }
  
  /**
   * Wait for submissions to complete
   */
  private async waitForCompletion(judgeUrl: string, tokens: string[]): Promise<any[]> {
    const results = [];
    
    for (const token of tokens) {
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!completed && attempts < maxAttempts) {
        const result = await axios.get(`${judgeUrl}/submissions/${token}`);
        
        if ((result.data as any).status.id > 2) { // Status > 2 means completed
          results.push(result.data);
          completed = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      if (!completed) {
        throw new Error(`Submission ${token} timed out`);
      }
    }
    
    return results;
  }
  
  /**
   * Get Judge0 instance for test
   */
  private async getJudge0Instance(testId: string) {
    return await prisma.judge0Instance.findUnique({
      where: { testId }
    });
  }
  
  /**
   * Get test session info
   */
  private async getTestSession(testId: string) {
    const instance = await this.getJudge0Instance(testId);
    return instance ? { 
      instanceId: instance.instanceId, 
      completed: instance.status === 'TERMINATED' 
    } : null;
  }
  
  /**
   * Check test progress
   */
  private async checkTestProgress(testId: string) {
    const submissions = await prisma.testSubmission.findMany({
      where: { 
        session: { 
          testId 
        }
      },
      include: { session: true }
    });
    
    const totalStudents = await this.getExpectedStudentCount(testId);
    const studentsSubmitted = new Set(submissions.map((s: any) => s.session.userId)).size;
    const resultsProcessed = submissions.every((s: any) => s.status !== 'PENDING');
    
    return {
      allStudentsSubmitted: studentsSubmitted >= totalStudents,
      allResultsProcessed: resultsProcessed,
      progress: {
        submitted: studentsSubmitted,
        total: totalStudents,
        processed: submissions.filter((s: any) => s.status !== 'PENDING').length
      }
    };
  }
  
  /**
   * Get expected student count for test
   */
  private async getExpectedStudentCount(testId: string): Promise<number> {
    const instance = await this.getJudge0Instance(testId);
    return instance?.studentsServed || 0;
  }
  
  /**
   * Format quick test results
   */
  private formatQuickTestResult(results: any[]): ExecutionResult {
    const passedTests = results.filter(r => r.status.description === 'Accepted').length;
    
    return {
      success: passedTests > 0,
      passedTests,
      totalTests: results.length,
      score: Math.round((passedTests / results.length) * 100),
      details: results.map(r => ({
        status: r.status.description,
        time: r.time,
        memory: r.memory,
        output: r.stdout || r.stderr
      }))
    };
  }
  
  /**
   * Calculate final score from all test cases
   */
  private calculateFinalScore(results: any[]): ExecutionResult {
    const passedTests = results.filter(r => r.status.description === 'Accepted').length;
    const totalTests = results.length;
    const score = Math.round((passedTests / totalTests) * 100);
    
    const avgTime = results.reduce((sum, r) => sum + (parseFloat(r.time) || 0), 0) / totalTests;
    const avgMemory = results.reduce((sum, r) => sum + (parseInt(r.memory) || 0), 0) / totalTests;
    
    return {
      success: passedTests === totalTests,
      passedTests,
      totalTests,
      score,
      executionTime: Math.round(avgTime * 1000), // Convert to ms
      memoryUsed: Math.round(avgMemory / 1024), // Convert to KB
      details: results.map(r => ({
        status: r.status.description,
        time: r.time,
        memory: r.memory
      }))
    };
  }
  
  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
} 