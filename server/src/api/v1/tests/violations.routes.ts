import { Router } from 'express';
import { protect, isTeacher } from '../../auth/auth.middleware';

const router = Router();

// All routes require authentication
router.use(protect);

// Teacher-only violation monitoring routes with inline handlers
router.get('/:testId/violations/stats', isTeacher, async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Mock response for now
    res.json({
      totalSessions: 0,
      sessionsWithViolations: 0,
      violationsByType: {
        TAB_SWITCH: 0,
        FULLSCREEN_EXIT: 0,
        COPY_PASTE: 0,
        DEV_TOOLS: 0,
        FOCUS_LOSS: 0,
        CONTEXT_MENU: 0
      },
      highRiskSessions: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get violation stats' });
  }
});

router.get('/:testId/sessions', isTeacher, async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Mock response for now
    res.json({
      sessions: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get test sessions' });
  }
});

router.post('/:testId/terminate-student', isTeacher, async (req, res) => {
  try {
    const { testId } = req.params;
    const { studentId, reason } = req.body;
    
    // Mock response for now
    res.json({ 
      success: true, 
      message: 'Student session terminated',
      studentId,
      reason
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate student session' });
  }
});

export default router; 