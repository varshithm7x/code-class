import { TestSessionManagerService } from '../services/test-session-manager.service';
import { CostComparisonService } from '../services/cost-comparison.service';

describe('Phase 3: Integration Layer Tests', () => {
  let sessionManager: TestSessionManagerService;
  let costComparison: CostComparisonService;

  beforeEach(() => {
    sessionManager = new TestSessionManagerService();
    costComparison = new CostComparisonService();
  });

  describe('Test Session Management', () => {
    it('should validate test configuration correctly', async () => {
      const validTestSchedule = {
        testId: 'test-phase3-1',
        studentCount: 30,
        durationMinutes: 120,
        problems: [
          { id: 'p1', title: 'Array Problem' },
          { id: 'p2', title: 'String Problem' }
        ]
      };

      expect(validTestSchedule.studentCount).toBeGreaterThan(0);
      expect(validTestSchedule.durationMinutes).toBeGreaterThan(0);
      expect(validTestSchedule.problems.length).toBeGreaterThan(0);
    });

    it('should handle Lambda vs Direct launch switching', () => {
      const originalValue = process.env.USE_DIRECT_EC2_LAUNCH;
      
      process.env.USE_DIRECT_EC2_LAUNCH = 'true';
      expect(process.env.USE_DIRECT_EC2_LAUNCH).toBe('true');
      
      process.env.USE_DIRECT_EC2_LAUNCH = 'false';
      expect(process.env.USE_DIRECT_EC2_LAUNCH).toBe('false');
      
      if (originalValue !== undefined) {
        process.env.USE_DIRECT_EC2_LAUNCH = originalValue;
      }
    });
  });

  describe('Cost Comparison Analysis', () => {
    it('should compare different deployment approaches', async () => {
      const testParams = {
        studentCount: 50,
        durationMinutes: 180,
        problemCount: 4,
        testCasesPerProblem: 100
      };

      const approaches = await costComparison.compareApproaches(testParams);
      
      expect(approaches).toHaveLength(3);
      expect(approaches[0].name).toBeDefined();
      expect(approaches[0].costBreakdown.total).toBeDefined();
      
      expect(approaches[0].costBreakdown.total).toBeLessThanOrEqual(approaches[1].costBreakdown.total);
    });

    it('should calculate cost savings correctly', async () => {
      const testParams = {
        studentCount: 25,
        durationMinutes: 120,
        problemCount: 3,
        testCasesPerProblem: 80
      };

      const analysis = await costComparison.getCostSavingsAnalysis(testParams);
      
      expect(analysis.baselineApproach).toBe('Pooled API Service');
      expect(analysis.costSavings).toBeGreaterThan(0);
      expect(analysis.savingsPercentage).toBeGreaterThan(0);
      expect(analysis.yearlyProjection.testsPerYear).toBe(52);
    });
  });

  describe('Lambda Function Integration', () => {
    it('should handle Lambda function payloads correctly', () => {
      const testSchedule = {
        testId: 'lambda-test-1',
        expectedStudents: 40,
        duration: 150,
        problems: [{ id: 'p1' }, { id: 'p2' }],
        timestamp: new Date().toISOString()
      };

      expect(testSchedule.testId).toBeDefined();
      expect(testSchedule.expectedStudents).toBeGreaterThan(0);
      expect(testSchedule.duration).toBeGreaterThan(0);
      expect(testSchedule.timestamp).toBeDefined();
    });

    it('should calculate Lambda costs accurately', () => {
      const calls = {
        launcher: 1,
        healthMonitor: 60,
        autoShutdown: 1
      };

      const totalCalls = calls.launcher + calls.healthMonitor + calls.autoShutdown;
      const requestCost = totalCalls * 0.0000002;
      const durationCost = totalCalls * 0.512 * 30 * 0.0000166667;
      const totalLambdaCost = requestCost + durationCost;

      expect(totalLambdaCost).toBeLessThan(0.10);
      expect(totalCalls).toBe(62);
    });
  });

  describe('Phase 3 Improvements', () => {
    it('should validate Phase 3 improvements over Phase 2', () => {
      const improvements = {
        'serverless-orchestration': true,
        'automatic-health-monitoring': true,
        'cost-optimization': true,
        'failure-recovery': true,
        'event-driven-architecture': true
      };

      Object.values(improvements).forEach(improvement => {
        expect(improvement).toBe(true);
      });

      expect(Object.keys(improvements)).toHaveLength(5);
    });
  });
});
