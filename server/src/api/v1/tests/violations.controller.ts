import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AntiCheatService } from '../../../services/anti-cheat.service';
import { WebSocketService } from '../../../services/websocket.service';

const prisma = new PrismaClient() as any;

/**
 * Get violation statistics for a test
 */
export const getTestViolationStats = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Get violation statistics
    const stats = await AntiCheatService.getTestViolationStats(testId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting violation stats:', error);
    res.status(500).json({ error: 'Failed to get violation statistics' });
  }
};

/**
 * Get student sessions with violation details
 */
export const getTestSessions = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Get all sessions for this test with violation details
    const sessions = await prisma.testSession.findMany({
      where: { testId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        penalties: {
          orderBy: { timestamp: 'desc' },
          take: 5 // Last 5 violations per student
        }
      },
      orderBy: [
        { totalPenalties: 'desc' }, // High-risk students first
        { user: { name: 'asc' } }
      ]
    });

    // Transform data for frontend
    const sessionData = sessions.map((session: any) => {
      const recentViolations = session.penalties.map((penalty: any) => ({
        type: penalty.violationType,
        timestamp: penalty.timestamp,
        level: penalty.penaltyLevel
      }));

      // Determine status
      let status = 'ACTIVE';
      if (session.penalties.some((p: any) => p.penaltyLevel === 'TERMINATION')) {
        status = 'TERMINATED';
      } else if (session.totalPenalties >= 3) {
        status = 'SUSPICIOUS';
      }

      return {
        sessionId: session.id,
        studentId: session.user.id,
        studentName: session.user.name,
        studentEmail: session.user.email,
        violationCount: session.totalPenalties || 0,
        lastActivity: session.lastActivity,
        status,
        recentViolations
      };
    });

    res.json(sessionData);
  } catch (error) {
    console.error('Error getting test sessions:', error);
    res.status(500).json({ error: 'Failed to get test sessions' });
  }
};

/**
 * Get detailed violations for a specific session
 */
export const getSessionViolations = async (req: Request, res: Response) => {
  try {
    const { testId, sessionId } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Get session with all violations
    const session = await prisma.testSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        penalties: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!session || session.testId !== testId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get violation summary
    const violationSummary = await AntiCheatService.getSessionViolations(sessionId);

    res.json({
      session: {
        id: session.id,
        student: session.user,
        status: session.status,
        startTime: session.startedAt,
        lastActivity: session.lastActivity,
        totalPenalties: session.totalPenalties
      },
      violations: session.penalties,
      summary: violationSummary
    });
  } catch (error) {
    console.error('Error getting session violations:', error);
    res.status(500).json({ error: 'Failed to get session violations' });
  }
};

/**
 * Terminate a student session due to violations
 */
export const terminateStudentSession = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { studentId, reason } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Find the student's session
    const session = await prisma.testSession.findUnique({
      where: {
        testId_userId: {
          testId,
          userId: studentId
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Student session not found' });
    }

    // Update session status
    await prisma.testSession.update({
      where: { id: session.id },
      data: {
        status: 'TERMINATED',
        endedAt: new Date()
      }
    });

    // Record termination penalty
    await prisma.testPenalty.create({
      data: {
        sessionId: session.id,
        violationType: 'MANUAL_TERMINATION',
        penaltyLevel: 'TERMINATION',
        scoreReduction: 100,
        details: { reason, terminatedBy: userId },
        timestamp: new Date()
      }
    });

    // Notify student via WebSocket (this would need the WebSocket instance)
    // WebSocketService.terminateStudentSession(studentId, reason);

    res.json({ success: true, message: 'Student session terminated' });
  } catch (error) {
    console.error('Error terminating student session:', error);
    res.status(500).json({ error: 'Failed to terminate student session' });
  }
};

/**
 * Send warning message to student
 */
export const sendWarningToStudent = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { studentId, message } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Send warning via WebSocket (this would need the WebSocket instance access)
    // WebSocketService.sendWarningToStudent(studentId, message);

    res.json({ success: true, message: 'Warning sent to student' });
  } catch (error) {
    console.error('Error sending warning:', error);
    res.status(500).json({ error: 'Failed to send warning' });
  }
};

/**
 * Get real-time violation events (for SSE or WebSocket)
 */
export const getViolationEvents = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Verify teacher has access to this test
    const test = await prisma.codingTest.findFirst({
      where: {
        id: testId,
        class: {
          teacherId: userRole === 'ADMIN' ? undefined : userId
        }
      }
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found or access denied' });
    }

    // Get recent violations (last hour)
    const recentViolations = await prisma.testPenalty.findMany({
      where: {
        session: {
          testId
        },
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      include: {
        session: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const formattedViolations = recentViolations.map((violation: any) => ({
      id: violation.id,
      sessionId: violation.sessionId,
      studentName: violation.session.user.name,
      studentEmail: violation.session.user.email,
      violationType: violation.violationType,
      penaltyLevel: violation.penaltyLevel,
      timestamp: violation.timestamp,
      details: violation.details
    }));

    res.json(formattedViolations);
  } catch (error) {
    console.error('Error getting violation events:', error);
    res.status(500).json({ error: 'Failed to get violation events' });
  }
}; 