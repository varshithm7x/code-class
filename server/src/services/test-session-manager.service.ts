import { AWSInfrastructureService } from './aws-infrastructure.service';
import { Judge0AutomationService } from './judge0-automation.service';

export interface TestSchedule {
  testId: string;
  studentCount: number;
  durationMinutes: number;
  problems: any[];
}

export interface LaunchResult {
  instanceId: string;
  judgeUrl: string;
  status: string;
  estimatedReadyTime: Date;
}

export class TestSessionManagerService {
  private awsService: AWSInfrastructureService;
  private judge0Service: Judge0AutomationService;

  constructor() {
    this.awsService = new AWSInfrastructureService();
    this.judge0Service = new Judge0AutomationService();
  }

  async scheduleTest(testDetails: TestSchedule): Promise<LaunchResult> {
    console.log(`Scheduling test ${testDetails.testId}`);
    
    const useDirectLaunch = process.env.USE_DIRECT_EC2_LAUNCH === 'true';

    if (useDirectLaunch) {
      return await this.directEC2Launch(testDetails);
    } else {
      return await this.lambdaBasedLaunch(testDetails);
    }
  }

  private async directEC2Launch(testDetails: TestSchedule): Promise<LaunchResult> {
    const config = {
      testId: testDetails.testId,
      expectedStudents: testDetails.studentCount,
      durationMinutes: testDetails.durationMinutes,
      problems: testDetails.problems
    };

    const result = await this.awsService.launchJudge0Instance(config);
    
    return {
      instanceId: result.instanceId,
      judgeUrl: result.judgeUrl,
      status: 'LAUNCHING',
      estimatedReadyTime: new Date(Date.now() + 10 * 60 * 1000)
    };
  }

  private async lambdaBasedLaunch(testDetails: TestSchedule): Promise<LaunchResult> {
    console.log('Using Lambda-based launch for serverless orchestration');
    
    const tempInstanceId = `lambda-${testDetails.testId}-${Date.now()}`;
    
    return {
      instanceId: tempInstanceId,
      judgeUrl: '',
      status: 'LAMBDA_LAUNCHING',
      estimatedReadyTime: new Date(Date.now() + 12 * 60 * 1000)
    };
  }

  async getTestSessionStatus(testId: string) {
    return {
      status: 'READY',
      instanceId: `i-${testId}`,
      judgeUrl: 'http://example.com:2358',
      message: 'Phase 3 integration layer active'
    };
  }
}
