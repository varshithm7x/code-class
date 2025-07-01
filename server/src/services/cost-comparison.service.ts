/**
 * Cost Comparison Service
 * Simplified to focus on current cost tracking only
 */

export interface TestParameters {
  studentCount: number;
  durationMinutes: number;
  problemCount: number;
  testCasesPerProblem: number;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  dataTransfer: number;
  lambdaCalls: number;
  total: number;
}

export class CostComparisonService {
  
  async calculateCurrentApproachCost(params: TestParameters) {
    const durationHours = params.durationMinutes / 60;
    const computeCost = durationHours * 0.0416; // t3.medium
    const storageCost = (30 * 0.10) / (30 * 24) * durationHours;
    
    return {
      name: 'Current EC2 Approach',
      description: 'Direct EC2 instance management',
      costBreakdown: {
        compute: Math.round(computeCost * 100) / 100,
        storage: Math.round(storageCost * 100) / 100,
        dataTransfer: 0.05,
        lambdaCalls: 0,
        total: Math.round((computeCost + storageCost + 0.05) * 100) / 100
      },
      advantages: ['Simple architecture', 'Direct control', 'Cost effective'],
      disadvantages: ['Manual monitoring required']
    };
  }

  async getCostProjection(params: TestParameters, testsPerMonth: number = 4) {
    const singleTestCost = await this.calculateCurrentApproachCost(params);
    
    return {
      perTest: singleTestCost.costBreakdown.total,
      monthly: Math.round(singleTestCost.costBreakdown.total * testsPerMonth * 100) / 100,
      yearly: Math.round(singleTestCost.costBreakdown.total * testsPerMonth * 12 * 100) / 100
    };
  }
}
 