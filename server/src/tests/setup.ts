// Jest setup file for Judge0 automation tests

// Mock AWS SDK to avoid requiring real AWS credentials in tests
jest.mock('aws-sdk', () => ({
  EC2: jest.fn(() => ({
    runInstances: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        Instances: [{ InstanceId: 'i-1234567890abcdef0' }]
      }))
    })),
    describeInstances: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        Reservations: [{
          Instances: [{
            State: { Name: 'running' },
            PublicIpAddress: '203.0.113.1',
            Tags: [{ Key: 'TestId', Value: 'test-123' }]
          }]
        }]
      }))
    })),
    terminateInstances: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({}))
    }))
  })),
  SSM: jest.fn(() => ({
    putParameter: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({}))
    })),
    getParameter: jest.fn(() => ({
      promise: jest.fn(() => Promise.resolve({
        Parameter: { Value: 'false' }
      }))
    }))
  })),
  config: {
    update: jest.fn()
  }
}));

// Mock Axios for HTTP requests
jest.mock('axios', () => ({
  default: {
    get: jest.fn(() => Promise.resolve({
      status: 200,
      data: [
        { id: 54, name: 'C++ (GCC 9.2.0)' },
        { id: 71, name: 'Python (3.8.1)' },
        { id: 62, name: 'Java (OpenJDK 13.0.1)' }
      ]
    })),
    post: jest.fn(() => Promise.resolve({
      status: 200,
      data: {
        status: { description: 'Accepted' },
        stdout: 'Hello Judge0',
        time: '0.01',
        memory: '1024'
      }
    }))
  },
  get: jest.fn(() => Promise.resolve({
    status: 200,
    data: [
      { id: 54, name: 'C++ (GCC 9.2.0)' },
      { id: 71, name: 'Python (3.8.1)' },
      { id: 62, name: 'Java (OpenJDK 13.0.1)' }
    ]
  })),
  post: jest.fn(() => Promise.resolve({
    status: 200,
    data: {
      status: { description: 'Accepted' },
      stdout: 'Hello Judge0',
      time: '0.01',
      memory: '1024'
    }
  }))
}));

// Mock Prisma client
const mockPrismaClient = {
  judge0Instance: {
    create: jest.fn(() => Promise.resolve({
      id: 'instance-123',
      testId: 'test-123',
      instanceId: 'i-1234567890abcdef0',
      judgeUrl: 'http://203.0.113.1:2358',
      status: 'LAUNCHING'
    })),
    findUnique: jest.fn(() => Promise.resolve({
      id: 'instance-123',
      testId: 'test-123',
      instanceId: 'i-1234567890abcdef0',
      judgeUrl: 'http://203.0.113.1:2358',
      status: 'READY',
      launchedAt: new Date(),
      cost: 0.12
    })),
    update: jest.fn(() => Promise.resolve({})),
    updateMany: jest.fn(() => Promise.resolve({}))
  },
  testSession: {
    findFirst: jest.fn(() => Promise.resolve({
      id: 'session-123',
      testId: 'test-123',
      userId: 'user-123'
    }))
  },
  testSubmission: {
    create: jest.fn(() => Promise.resolve({
      id: 'submission-123',
      status: 'ACCEPTED',
      score: 100
    })),
    findMany: jest.fn(() => Promise.resolve([]))
  },
  $disconnect: jest.fn(() => Promise.resolve())
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

// Set default environment variables for tests
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Global cleanup function
global.afterEach = global.afterEach || (() => {});

// Cleanup after each test
afterEach(async () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear timers
  jest.clearAllTimers();
  
  // Cleanup any pending promises
  await new Promise(resolve => setImmediate(resolve));
});

console.log('Judge0 automation test setup completed'); 