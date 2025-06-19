import { Router } from 'express';
import { protect } from '../auth/auth.middleware';
import { 
  startTestSession, 
  getTestSession, 
  submitCode, 
  updateHeartbeat, 
  recordPenalty, 
  completeTestSession, 
  runTestCases,
  getTestSessionStatus,
  submitSingleProblem
} from './test-session.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// Basic test session management routes (working ones)
router.post('/:testId/start-session', startTestSession);
router.get('/:testId/session', getTestSession);
router.post('/:testId/submit-code', submitCode);
router.patch('/:testId/session/heartbeat', updateHeartbeat);
router.post('/:testId/session/penalty', recordPenalty);
router.post('/:testId/session/complete', completeTestSession);
router.post('/:testId/run-tests', runTestCases);

// Test session status (for results page)
router.get('/:testId/status', getTestSessionStatus);

// Submit individual problem (immediate execution)
router.post('/:testId/submit', submitSingleProblem);

// Join test endpoint (POST)
router.post('/:testId/join', async (req, res) => {
  try {
    const { testId } = req.params;
    
    res.json({
      success: true,
      session: {
        id: `session-${Date.now()}`,
        testId,
        userId: 'mock-user',
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString()
      },
      test: {
        id: testId,
        title: 'Sample Test',
        description: 'A sample coding test',
        duration: 120,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        allowedLanguages: ['cpp', 'python', 'java'],
        problems: [
          {
            id: 'p1',
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            difficulty: 'EASY',
            timeLimit: 30,
            memoryLimit: 256,
            order: 1,
            testCases: JSON.stringify([
              { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
              { input: '[3,2,4]\n6', expectedOutput: '[1,2]' }
            ])
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join test' });
  }
});

// Submit solution endpoint
router.post('/:testId/submit', async (req, res) => {
  try {
    const { testId } = req.params;
    const { problemId, code, language } = req.body;
    
    // Mock submission response
    res.json({
      success: true,
      submission: {
        id: `submission-${Date.now()}`,
        problemId,
        code,
        language,
        status: 'ACCEPTED',
        score: 100,
        executionTime: 45,
        memoryUsed: 128,
        testCasesPassed: 2,
        totalTestCases: 2
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit solution' });
  }
});

// Simple join endpoint for now (GET - for compatibility)
router.get('/:testId/join', async (req, res) => {
  try {
    // Mock response for now
    res.json({
      test: {
        id: req.params.testId,
        title: 'Sample Test',
        description: 'A sample coding test',
        duration: 120,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        allowedLanguages: ['cpp', 'python', 'java'],
        problems: [
          {
            id: 'p1',
            title: 'Two Sum',
            description: 'Find two numbers that add up to target',
            difficulty: 'EASY',
            timeLimit: 30,
            memoryLimit: 256,
            order: 1,
            testCases: [
              {
                id: 'tc1',
                input: '2\n[2,7,11,15]\n9',
                expectedOutput: '[0,1]',
                isPublic: true
              }
            ]
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join test' });
  }
});

export default router; 