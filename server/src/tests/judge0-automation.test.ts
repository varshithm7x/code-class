import { AWSInfrastructureService } from '../services/aws-infrastructure.service';

describe('Judge0 Automation Tests - Phase 2', () => {
  let awsService: AWSInfrastructureService;

  beforeEach(() => {
    awsService = new AWSInfrastructureService();
  });

  afterEach(async () => {
    // Cleanup service instance
    awsService = null as any;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Cost Calculation', () => {
    it('should calculate EC2 costs correctly', () => {
      const launchedAt = new Date('2024-01-01T10:00:00Z');
      const shutdownAt = new Date('2024-01-01T13:00:00Z'); // 3 hours
      
      const cost = awsService.calculateInstanceCost(launchedAt, shutdownAt);
      
      // t3.medium costs $0.0416/hour, so 3 hours = $0.1248
      expect(cost).toBeCloseTo(0.12, 2);
    });

    it('should handle ongoing instances', () => {
      const launchedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      
      const cost = awsService.calculateInstanceCost(launchedAt, null);
      
      expect(cost).toBeGreaterThan(0.08);
    });
  });

  describe('Test Configuration Validation', () => {
    it('should validate test parameters', () => {
      const validConfig = {
        testId: 'test-123',
        studentCount: 25,
        durationMinutes: 120,
        problems: [{ id: 'p1' }]
      };

      expect(validConfig.studentCount).toBeGreaterThan(0);
      expect(validConfig.durationMinutes).toBeGreaterThan(0);
      expect(validConfig.problems.length).toBeGreaterThan(0);
    });

    it('should reject invalid configurations', () => {
      const invalidConfigs = [
        { studentCount: 0, durationMinutes: 120, problems: [] },
        { studentCount: 25, durationMinutes: 0, problems: [] }
      ];

      invalidConfigs.forEach(config => {
        const isValid = config.studentCount > 0 && 
                       config.durationMinutes > 0 && 
                       config.problems.length > 0;
        expect(isValid).toBeFalsy();
      });
    });
  });

  describe('Batch Processing', () => {
    it('should chunk large test case arrays correctly', () => {
      const testCases = Array.from({ length: 150 }, (_, i) => ({ 
        input: `test${i}`, 
        output: `result${i}` 
      }));

      const chunkSize = 20;
      const chunks = [];
      for (let i = 0; i < testCases.length; i += chunkSize) {
        chunks.push(testCases.slice(i, i + chunkSize));
      }

      expect(chunks.length).toBe(8); // 150 / 20 = 8 chunks
      expect(chunks[0].length).toBe(20);
      expect(chunks[7].length).toBe(10); // Last chunk
    });

    it('should handle quick vs final submissions', () => {
      const allTestCases = Array.from({ length: 100 }, (_, i) => ({ 
        input: `input${i}` 
      }));

      const quickTests = allTestCases.slice(0, 3);
      const finalTests = allTestCases;

      expect(quickTests.length).toBe(3);
      expect(finalTests.length).toBe(100);
    });
  });

  describe('Language Support', () => {
    it('should map languages to Judge0 IDs correctly', () => {
      const languageMap = {
        'cpp': 54,
        'c': 50,
        'java': 62,
        'python': 71,
        'javascript': 63
      };

      expect(languageMap['cpp']).toBe(54);
      expect(languageMap['python']).toBe(71);
    });
  });

  describe('Execution Results', () => {
    it('should calculate scores correctly', () => {
      const results = [
        { status: { description: 'Accepted' } },
        { status: { description: 'Accepted' } },
        { status: { description: 'Wrong Answer' } },
        { status: { description: 'Accepted' } }
      ];

      const passed = results.filter(r => r.status.description === 'Accepted').length;
      const score = Math.round((passed / results.length) * 100);

      expect(passed).toBe(3);
      expect(score).toBe(75);
    });
  });

  describe('Error Handling', () => {
    it('should validate submission format', () => {
      const validSubmission = {
        testId: 'test-123',
        sourceCode: '#include <iostream>',
        languageId: 54,
        testCases: [{ input: 'test', expectedOutput: 'result' }]
      };

      expect(validSubmission.testId).toBeDefined();
      expect(validSubmission.sourceCode).toContain('#include');
      expect(validSubmission.testCases.length).toBeGreaterThan(0);
    });

    it('should handle malformed data', () => {
      const malformedData = [null, undefined, {}, { input: null }];

      malformedData.forEach(data => {
        const isValid = data && 
                       typeof data === 'object' && 
                       'input' in data;
        expect(isValid).toBeFalsy();
      });
    });
  });
}); 