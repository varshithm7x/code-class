import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { WebSocketService } from '../../services/websocket.service';
import { Judge0AutomationService } from '../../services/judge0-automation.service';
import { TestCompletionDetectorService } from '../../services/test-completion-detector.service';
import { AdminNotificationService } from '../../services/admin-notification.service';
import { CostTrackingService } from '../../services/cost-tracking.service';

const prisma = new PrismaClient() as any;
const judge0Service = new Judge0AutomationService();
const completionDetector = new TestCompletionDetectorService();
const notificationService = new AdminNotificationService();
const costTracker = new CostTrackingService();

// Validation schemas
const realTimeExecutionSchema = z.object({
  code: z.string().min(1),
  language: z.enum(['cpp', 'c', 'java', 'python', 'javascript']),
  problemId: z.string().cuid()
});

const finalSubmissionSchema = z.object({
  submissions: z.array(z.object({
    problemId: z.string().cuid(),
    code: z.string().min(1),
    language: z.enum(['cpp', 'c', 'java', 'python', 'javascript'])
  })).min(1)
});

/**
 * Start a new test session for a student
 */
export const startTestSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual test session logic
    res.status(200).json({ 
      message: 'Test session started',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error starting test session:', error);
    res.status(500).json({ error: 'Failed to start test session' });
  }
};

/**
 * Get current test session state
 */
export const getTestSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual test session retrieval logic
    res.status(200).json({ 
      message: 'Test session retrieved',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error getting test session:', error);
    res.status(500).json({ error: 'Failed to get test session' });
  }
};

/**
 * Submit code for a specific problem
 */
export const submitCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual code submission logic
    res.status(200).json({ 
      message: 'Code submitted',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error submitting code:', error);
    res.status(500).json({ error: 'Failed to submit code' });
  }
};

/**
 * Update session heartbeat and current state
 */
export const updateHeartbeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual heartbeat logic
    res.status(200).json({ 
      message: 'Heartbeat updated',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
};

/**
 * Record a penalty for the session
 */
export const recordPenalty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual penalty recording logic
    res.status(200).json({ 
      message: 'Penalty recorded',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error recording penalty:', error);
    res.status(500).json({ error: 'Failed to record penalty' });
  }
};

/**
 * Complete the test session
 */
export const completeTestSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual test completion logic
    res.status(200).json({ 
      message: 'Test session completed',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error completing test session:', error);
    res.status(500).json({ error: 'Failed to complete test session' });
  }
};

/**
 * Run test cases for code without submitting
 */
export const runTestCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    
    // TODO: Implement actual test case running logic
    res.status(200).json({ 
      message: 'Test cases executed',
      testId,
      status: 'success'
    });
  } catch (error) {
    console.error('Error running test cases:', error);
    res.status(500).json({ error: 'Failed to run test cases' });
  }
};

/**
 * Join a test session
 */
export const joinTestSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const { testId } = req.params;

    // Only students can join test sessions
    if (userRole !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can join test sessions' });
    }

    // Verify test exists and user has access
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          students: { some: { userId } }
        }
      },
      include: {
        class: true,
        problems: {
          select: {
            id: true,
            title: true,
            description: true,
            constraints: true,
            examples: true,
            difficulty: true,
            timeLimit: true,
            memoryLimit: true,
            order: true,
            testCases: {
              where: { isPublic: true },
              select: {
                id: true,
                input: true,
                expectedOutput: true,
                isPublic: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Check if test is active
    const now = new Date();
    if (now < test.startTime || now > test.endTime || !test.isActive) {
      return res.status(400).json({ error: 'Test is not currently active' });
    }

    // Find or create test session
    let session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      session = await prisma.testSession.create({
        data: {
          testId,
          userId,
          status: 'IN_PROGRESS'
        },
        include: {
          submissions: true
        }
      });
    }

    res.json({
      session: {
        id: session.id,
        status: session.status,
        currentProblemIndex: session.currentProblemIndex,
        penaltyCount: session.penaltyCount
      },
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        duration: test.duration,
        startTime: test.startTime,
        endTime: test.endTime,
        allowedLanguages: test.allowedLanguages,
        problems: test.problems
      },
      submissions: session.submissions
    });

  } catch (error) {
    console.error('Error joining test session:', error);
    res.status(500).json({ error: 'Failed to join test session' });
  }
};

/**
 * Execute code in real-time for testing (with rate limiting)
 */
export const executeRealTime = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;
    const validatedData = realTimeExecutionSchema.parse(req.body);

    // Verify test session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        test: {
          include: {
            problems: {
              where: { id: validatedData.problemId },
              include: {
                testCases: {
                  where: { isPublic: true }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Test session is not active' });
    }

    const problem = session.test.problems[0];
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Check if language is allowed
    if (!session.test.allowedLanguages.includes(validatedData.language)) {
      return res.status(400).json({ error: 'Language not allowed for this test' });
    }

    // TODO: Execute code with new EC2-based Judge0 service
    const result = {
      status: 'PENDING',
      message: 'Code execution service is being migrated to EC2-based approach',
      testCaseResults: []
    };

    // Update last activity
    await prisma.testSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() }
    });

    res.json(result);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error executing real-time code:', error);
    res.status(500).json({ error: 'Code execution failed' });
  }
};

/**
 * Submit final solutions (queued for batch processing)
 */
export const submitFinalSolutions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;
    const validatedData = finalSubmissionSchema.parse(req.body);

    // Verify test session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        test: {
          include: {
            problems: {
              include: {
                testCases: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Test session is not active' });
    }

    // Validate all problem IDs and languages
    const problemIds = session.test.problems.map((p: any) => p.id);
    for (const submission of validatedData.submissions) {
      if (!problemIds.includes(submission.problemId)) {
        return res.status(400).json({ error: `Invalid problem ID: ${submission.problemId}` });
      }
      if (!session.test.allowedLanguages.includes(submission.language)) {
        return res.status(400).json({ error: `Language ${submission.language} not allowed` });
      }
    }

    // Create submissions in database
    const createdSubmissions = await Promise.all(
      validatedData.submissions.map(submissionData => 
        prisma.testSubmission.create({
          data: {
            sessionId: session.id,
            problemId: submissionData.problemId,
            code: submissionData.code,
            language: submissionData.language,
            status: 'QUEUED'
          }
        })
      )
    );

    // TODO: Queue submissions for batch processing with new EC2-based service
    // Submissions will be processed when EC2 Judge0 service is implemented

    // Update session status
    await prisma.testSession.update({
      where: { id: session.id },
      data: { 
        status: 'SUBMITTED',
        lastActivity: new Date()
      }
    });

    res.json({
      message: 'Solutions submitted successfully',
      submissionIds: createdSubmissions.map(s => s.id),
      queuedForBatch: true
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error submitting final solutions:', error);
    res.status(500).json({ error: 'Submission failed' });
  }
};

/**
 * Get test session status and results
 */
export const getSessionStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;

    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            problem: {
              select: { title: true, difficulty: true }
            }
          }
        },
        penalties: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    res.json({
      session: {
        id: session.id,
        status: session.status,
        currentProblemIndex: session.currentProblemIndex,
        penaltyCount: session.penaltyCount,
        lastActivity: session.lastActivity
      },
      submissions: session.submissions,
      penalties: session.penalties
    });

  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({ error: 'Failed to get session status' });
  }
};

/**
 * Get test session status for results page
 */
export const getTestSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;

    // Find the test session for this user and test
    const session = await prisma.testSession.findFirst({
      where: {
        testId,
        userId
      },
      include: {
        test: {
          include: {
            problems: {
              orderBy: { order: 'asc' }
            }
          }
        },
        submissions: {
          include: {
            problem: {
              select: { id: true, title: true, difficulty: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Test session not found' });
      return;
    }

    // Format the response
    const formattedSession = {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      submissions: session.submissions.map((sub: any) => ({
        id: sub.id,
        problemId: sub.problemId,
        code: sub.code,
        language: sub.language,
        status: sub.status,
        score: sub.score || 0,
        executionTime: sub.executionTime || 0,
        memoryUsed: sub.memoryUsed || 0,
        submittedAt: sub.createdAt,
        problem: sub.problem,
        judgeResponse: sub.judgeResponse
      }))
    };

    res.json({ session: formattedSession });

  } catch (error) {
    console.error('Error getting test session status:', error);
    res.status(500).json({ error: 'Failed to get test session status' });
  }
};

/**
 * Submit a single problem solution for immediate evaluation
 */
export const submitSingleProblem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;
    const { problemId, code, language } = req.body;

    if (!problemId || !code || !language) {
      res.status(400).json({ error: 'Problem ID, code, and language are required' });
      return;
    }

    // Verify test session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        test: {
          include: {
            problems: {
              where: { id: problemId },
              include: {
                testCases: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      res.status(404).json({ error: 'Test session not found' });
      return;
    }

    if (session.status !== 'IN_PROGRESS') {
      res.status(400).json({ error: 'Test session is not active' });
      return;
    }

    const problem = session.test.problems[0];
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Check if language is allowed
    if (!session.test.allowedLanguages.includes(language)) {
      res.status(400).json({ error: 'Language not allowed for this test' });
      return;
    }

    // Create submission in database
    const submission = await prisma.testSubmission.create({
      data: {
        sessionId: session.id,
        problemId: problem.id,
        code: code,
        language: language,
        status: 'PROCESSING',
        // submissionTime field doesn't exist - using createdAt instead
      }
    });

    // TODO: Execute immediately using new EC2-based Judge0
    try {
      // Placeholder for EC2 Judge0 implementation
      
      // Fetch updated submission with results
      const updatedSubmission = await prisma.testSubmission.findUnique({
        where: { id: submission.id }
      });

      res.json({
        message: 'Submission processed successfully',
        submission: updatedSubmission
      });

    } catch (executionError) {
      // Update submission status to failed
      await prisma.testSubmission.update({
        where: { id: submission.id },
        data: { 
          status: 'SYSTEM_ERROR',
          judgeResponse: { error: 'Execution failed' }
        }
      });

      res.status(500).json({ 
        error: 'Code execution failed',
        submission: { id: submission.id, status: 'SYSTEM_ERROR', score: 0 }
      });
    }

  } catch (error) {
    console.error('Error submitting single problem:', error);
    res.status(500).json({ error: 'Submission failed' });
  }
}; 

/**
 * Execute code in real-time using multi-test functionality (Codeforces style)
 * Enhanced version that uses solve() function pattern for massive efficiency gains
 */
export const executeRealTimeMultiTest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;
    
    // Enhanced validation schema for solve function
    const multiTestExecutionSchema = z.object({
      solveFunction: z.string().min(1),
      problemId: z.string().cuid(),
      isMultiTestEnabled: z.boolean().default(true)
    });

    const validatedData = multiTestExecutionSchema.parse(req.body);

    // Verify test session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        test: {
          include: {
            problems: {
              where: { id: validatedData.problemId },
              include: {
                testCases: {
                  where: { isPublic: true }
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Test session is not active' });
    }

    const problem = session.test.problems[0];
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const testCases = problem.testCases.map((tc: any) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      isPublic: tc.isPublic
    }));

    // Use multi-test execution if enabled and language is C++
    if (validatedData.isMultiTestEnabled && testCases.length > 1) {
      console.log(`🚀 Using multi-test execution for ${testCases.length} test cases`);
      
      // TODO: Execute using multi-test approach with new EC2-based Judge0
      const result = {
        success: false,
        results: [],
        executionTime: 0,
        memoryUsed: 0,
        totalTestCases: testCases.length,
        passedTestCases: 0,
        error: 'Service migrating to EC2-based approach'
      };

      // Update last activity
      await prisma.testSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });

      // Format response to match original API
      const formattedResult = {
        success: result.success,
        testCaseResults: result.results.map((r: any) => ({
          input: r.input || '',
          expectedOutput: r.expectedOutput || '',
          actualOutput: r.actualOutput || '',
          passed: r.passed || false,
          status: r.status || 'PENDING'
        })),
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        totalTestCases: result.totalTestCases,
        passedTestCases: result.passedTestCases,
        multiTestUsed: true,
        efficiencyGain: testCases.length,
        error: result.error
      };

      return res.json(formattedResult);
      
    } else {
      // Fallback to traditional single-test execution
      console.log('📝 Using traditional single-test execution');
      
      // Convert solve function to full code for backward compatibility
      const fullCode = `#include <bits/stdc++.h>
using namespace std;

${validatedData.solveFunction}

int main() {
    solve();
    return 0;
}`;

      // TODO: Execute with new EC2-based Judge0 service
      const result = {
        success: false,
        testCaseResults: [],
        message: 'Service migrating to EC2-based approach'
      };

      // Update last activity
      await prisma.testSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });

      return res.json({
        ...result,
        multiTestUsed: false,
        efficiencyGain: 1
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error executing multi-test real-time code:', error);
    res.status(500).json({ error: 'Multi-test code execution failed' });
  }
};

/**
 * Submit final solutions using multi-test approach for efficiency
 */
export const submitFinalSolutionsMultiTest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;
    
    const multiTestFinalSubmissionSchema = z.object({
      submissions: z.array(z.object({
        problemId: z.string().cuid(),
        solveFunction: z.string().min(1),
        useMultiTest: z.boolean().default(true)
      })).min(1)
    });

    const validatedData = multiTestFinalSubmissionSchema.parse(req.body);

    // Verify test session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: { testId, userId }
      },
      include: {
        test: {
          include: {
            problems: {
              include: {
                testCases: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Test session not found' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Test session is not active' });
    }

    // Process each submission
    const results = [];
    
    for (const submissionData of validatedData.submissions) {
      const problem = session.test.problems.find((p: any) => p.id === submissionData.problemId);
      if (!problem) {
        return res.status(400).json({ error: `Problem not found: ${submissionData.problemId}` });
      }

      // Create submission record
      const submission = await prisma.testSubmission.create({
        data: {
          sessionId: session.id,
          problemId: submissionData.problemId,
          code: submissionData.solveFunction,
          language: 'cpp',
          status: 'PROCESSING'
        }
      });

      try {
        const testCases = problem.testCases.map((tc: any) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isPublic: tc.isPublic
        }));

        let executionResult;

        if (submissionData.useMultiTest && testCases.length > 3) {
          // Use multi-test execution for efficiency
          console.log(`🚀 Processing ${testCases.length} test cases with multi-test approach`);
          
          // TODO: Execute with new EC2-based Judge0 service
          executionResult = {
            success: false,
            passedTestCases: 0,
            totalTestCases: testCases.length,
            executionTime: 0,
            memoryUsed: 0,
            results: []
          };
          
          // Calculate score based on passed test cases
          const score = executionResult.success ? 
            (executionResult.passedTestCases / executionResult.totalTestCases) * 100 : 0;

          // Update submission with results
          await prisma.testSubmission.update({
            where: { id: submission.id },
            data: {
              status: executionResult.success ? 'ACCEPTED' : 'WRONG_ANSWER',
              score: score,
              executionTime: executionResult.executionTime,
              memoryUsed: executionResult.memoryUsed,
              judgeResponse: {
                multiTestUsed: true,
                totalTestCases: executionResult.totalTestCases,
                passedTestCases: executionResult.passedTestCases,
                results: executionResult.results,
                efficiencyGain: testCases.length
              }
            }
          });

        } else {
          // Use traditional single-test execution for smaller test suites
          console.log(`📝 Processing ${testCases.length} test cases with traditional approach`);
          
          // Convert solve function to full code
          const fullCode = `#include <bits/stdc++.h>
using namespace std;

${submissionData.solveFunction}

int main() {
    solve();
    return 0;
}`;

          // TODO: Process using new EC2-based Judge0 service
          // Placeholder for EC2 Judge0 implementation
        }

        results.push({
          submissionId: submission.id,
          problemId: submissionData.problemId,
          status: 'PROCESSED',
          multiTestUsed: submissionData.useMultiTest && testCases.length > 3
        });

      } catch (executionError) {
        console.error(`Execution failed for submission ${submission.id}:`, executionError);
        
        // Update submission with error
        await prisma.testSubmission.update({
          where: { id: submission.id },
          data: {
            status: 'SYSTEM_ERROR',
            score: 0,
            judgeResponse: { error: 'Execution failed', multiTestUsed: false }
          }
        });

        results.push({
          submissionId: submission.id,
          problemId: submissionData.problemId,
          status: 'ERROR',
          error: 'Execution failed'
        });
      }
    }

    // Update session status
    await prisma.testSession.update({
      where: { id: session.id },
      data: { 
        status: 'SUBMITTED',
        lastActivity: new Date()
      }
    });

    res.json({
      message: 'Solutions processed successfully',
      results: results,
      multiTestOptimization: true
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error processing multi-test final solutions:', error);
    res.status(500).json({ error: 'Multi-test submission processing failed' });
  }
}; 

/**
 * Schedule test with automated EC2 Judge0 instance launch
 */
export const scheduleAutomatedTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;
    const userRole = (req as any).user.role;

    // Only teachers can schedule tests
    if (userRole !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can schedule automated tests' });
      return;
    }

    // Get test details
    const test = await prisma.codingTest.findUnique({
      where: { id: testId },
      include: {
        class: {
          include: {
            students: true
          }
        },
        problems: {
          include: {
            testCases: true
          }
        }
      }
    });

    if (!test) {
      res.status(404).json({ error: 'Test not found' });
      return;
    }

    // Calculate expected student count
    const studentCount = test.class.students.length;
    
    // Prepare test schedule
    const testSchedule = {
      testId: test.id,
      studentCount,
      durationMinutes: test.duration,
      problems: test.problems,
      startTime: test.startTime
    };

    // Launch automated Judge0 instance
    const judgeUrl = await judge0Service.scheduleTest(testSchedule);

    // Start monitoring in the background
    judge0Service.monitorTestProgress(testId).catch(error => {
      console.error('Test monitoring failed:', error);
    });

    res.json({
      message: 'Automated test scheduled successfully',
      testId,
      judgeUrl,
      expectedStudents: studentCount,
      estimatedCost: '$0.31-0.53',
      status: 'LAUNCHING'
    });

  } catch (error) {
    console.error('Error scheduling automated test:', error);
    res.status(500).json({ error: 'Failed to schedule automated test' });
  }
};

/**
 * Execute real-time code using automated Judge0 EC2 instance
 */
export const executeRealTimeAutomated = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;

    const validatedData = realTimeExecutionSchema.parse(req.body);

    // Get Judge0 instance for this test
    const instance = await prisma.judge0Instance.findUnique({
      where: { testId }
    });

    const problem = await prisma.testProblem.findUnique({
      where: { id: validatedData.problemId },
      include: { testCases: true }
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    // Map language to Judge0 language ID
    const languageMap = {
      'cpp': 54,
      'c': 50,
      'java': 62,
      'python': 71,
      'javascript': 63
    };

    const languageId = languageMap[validatedData.language];
    if (!languageId) {
      res.status(400).json({ error: 'Unsupported language' });
      return;
    }

    // Prepare submission for quick test (first 3 test cases)
    const testCases = JSON.parse(problem.testCases).slice(0, 3);
    
    const quickSubmission = {
      testId,
      studentId: userId,
      problemId: validatedData.problemId,
      sourceCode: validatedData.code,
      languageId,
      testCases: testCases.map((tc: any) => ({
        input: tc.input,
        expectedOutput: tc.output
      }))
    };

    // Execute using automated Judge0 service
    const result = await judge0Service.runQuickTest(quickSubmission);

    res.json({
      success: result.success,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      score: result.score,
      details: result.details,
      automated: true,
      instanceUrl: instance?.judgeUrl
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error executing automated real-time code:', error);
    res.status(500).json({ error: 'Automated code execution failed' });
  }
};

/**
 * Submit final solutions using automated Judge0 EC2 instance
 */
export const submitFinalSolutionsAutomated = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { testId } = req.params;

    const validatedData = finalSubmissionSchema.parse(req.body);

    // Get Judge0 instance for this test
    const instance = await prisma.judge0Instance.findUnique({
      where: { testId }
    });

    if (!instance) {
      res.status(400).json({ error: 'Automated Judge0 instance not found for this test' });
      return;
    }

    // Process each final submission
    const results = [];

    for (const submission of validatedData.submissions) {
      const problem = await prisma.testProblem.findUnique({
        where: { id: submission.problemId },
        include: { testCases: true }
      });

      if (!problem) {
        continue;
      }

      // Map language to Judge0 language ID
      const languageMap = {
        'cpp': 54,
        'c': 50,
        'java': 62,
        'python': 71,
        'javascript': 63
      };

      const languageId = languageMap[submission.language];
      if (!languageId) {
        continue;
      }

      // Prepare final submission with all test cases
      const allTestCases = JSON.parse(problem.testCases);
      
      const finalSubmission = {
        testId,
        studentId: userId,
        problemId: submission.problemId,
        sourceCode: submission.code,
        languageId,
        testCases: allTestCases.map((tc: any) => ({
          input: tc.input,
          expectedOutput: tc.output
        }))
      };

      try {
        // Execute final submission with all test cases
        const result = await judge0Service.runFinalSubmission(finalSubmission);

        // Store submission result
        const testSubmission = await prisma.testSubmission.create({
          data: {
            sessionId: (await prisma.testSession.findFirst({
              where: { testId, userId }
            }))?.id || '',
            problemId: submission.problemId,
            code: submission.code,
            language: submission.language,
            status: result.success ? 'ACCEPTED' : 'WRONG_ANSWER',
            score: result.score,
            executionTime: result.executionTime,
            memoryUsed: result.memoryUsed,
            judgeOutput: {
              automated: true,
              passedTests: result.passedTests,
              totalTests: result.totalTests,
              details: result.details
            }
          }
        });

        results.push({
          submissionId: testSubmission.id,
          problemId: submission.problemId,
          score: result.score,
          passedTests: result.passedTests,
          totalTests: result.totalTests,
          automated: true
        });

      } catch (error) {
        console.error('Final submission execution failed:', error);
        results.push({
          problemId: submission.problemId,
          error: 'Execution failed',
          automated: true
        });
      }
    }

    res.json({
      message: 'Final solutions processed successfully',
      results,
      automated: true,
      instanceUrl: instance.judgeUrl
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Error processing automated final solutions:', error);
    res.status(500).json({ error: 'Automated final submission processing failed' });
  }
};

/**
 * Get Judge0 instance status for a test
 */
export const getJudge0InstanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { testId } = req.params;

    const instance = await prisma.judge0Instance.findUnique({
      where: { testId },
      include: {
        test: {
          select: {
            title: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    if (!instance) {
      res.status(404).json({ error: 'Judge0 instance not found for this test' });
      return;
    }

    // Calculate runtime if active
    const runtime = instance.status === 'ACTIVE' 
      ? Math.round((Date.now() - instance.launchedAt.getTime()) / 1000 / 60) // minutes
      : 0;

    res.json({
      instanceId: instance.instanceId,
      status: instance.status,
      judgeUrl: instance.judgeUrl,
      launchedAt: instance.launchedAt,
      readyAt: instance.readyAt,
      runtime,
      cost: instance.cost,
      studentsServed: instance.studentsServed,
      submissionsCount: instance.submissionsCount,
      automated: true
    });

  } catch (error) {
    console.error('Error getting Judge0 instance status:', error);
    res.status(500).json({ error: 'Failed to get instance status' });
  }
}; 