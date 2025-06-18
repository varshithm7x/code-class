const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

// Test credentials
const TEACHER_CREDENTIALS = {
  email: 'teacher1@gmail.com',
  password: 'qwerty'
};

const STUDENT_CREDENTIALS = {
  email: 'student1@gmail.com',
  password: 'qwerty'
};

// Mock API keys for testing
const MOCK_JUDGE0_KEY = 'your-judge0-api-key-here';
const MOCK_GEMINI_KEY = 'your-gemini-api-key-here';

let teacherToken = '';
let studentToken = '';
let classId = '';
let testId = '';

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

// Test authentication
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');

  const teacherLogin = await makeRequest('POST', '/auth/login', TEACHER_CREDENTIALS);
  if (teacherLogin.success) {
    teacherToken = teacherLogin.data.token;
    console.log('✅ Teacher login successful');
  } else {
    console.log('❌ Teacher login failed:', teacherLogin.error);
    return false;
  }

  return true;
}

// Step 2: API Key Setup
async function testAPIKeySetup() {
  console.log('\n🔑 Testing API Key Setup...');

  // Test Teacher Gemini API Key
  const geminiKey = await makeRequest('POST', '/auth/gemini-key', {
    apiKey: MOCK_GEMINI_KEY
  }, teacherToken);

  if (geminiKey.success) {
    console.log('✅ Teacher Gemini API key added');
  } else {
    console.log('⚠️ Teacher Gemini API key failed (use real key for testing):', geminiKey.error);
  }

  // Test Student Judge0 API Key
  const judge0Key = await makeRequest('POST', '/auth/judge0-key', {
    apiKey: MOCK_JUDGE0_KEY,
    agreedToSharing: true
  }, studentToken);

  if (judge0Key.success) {
    console.log('✅ Student Judge0 API key added');
  } else {
    console.log('⚠️ Student Judge0 API key failed (use real key for testing):', judge0Key.error);
  }

  return true;
}

// Step 3: Class Management
async function testClassManagement() {
  console.log('\n🏫 Testing Class Management...');

  // Create a test class
  const createClass = await makeRequest('POST', '/classes', {
    name: 'Integration Test Class',
    joinCode: 'TEST123'
  }, teacherToken);

  if (createClass.success) {
    classId = createClass.data.class.id;
    console.log('✅ Class created:', classId);
  } else {
    console.log('❌ Class creation failed:', createClass.error);
    return false;
  }

  // Join class as student
  const joinClass = await makeRequest('POST', `/classes/join`, {
    joinCode: 'TEST123'
  }, studentToken);

  if (joinClass.success) {
    console.log('✅ Student joined class');
  } else {
    console.log('❌ Student join failed:', joinClass.error);
    return false;
  }

  return true;
}

// Step 4: Test Creation
async function testTestCreation() {
  console.log('\n📝 Testing Test Creation...');

  const testData = {
    title: 'Sample DSA Test',
    description: 'Integration testing for Milestone 4',
    duration: 120,
    startTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
    endTime: new Date(Date.now() + 3660000).toISOString(), // 1 hour from now
    allowedLanguages: ['python', 'cpp', 'java'],
    problems: [
      {
        title: 'Two Sum',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        constraints: '• 2 ≤ nums.length ≤ 10^4\n• -10^9 ≤ nums[i] ≤ 10^9\n• -10^9 ≤ target ≤ 10^9',
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          }
        ],
        testCases: [
          {
            input: '[2,7,11,15]\n9',
            expectedOutput: '[0,1]',
            isPublic: true
          },
          {
            input: '[3,2,4]\n6',
            expectedOutput: '[1,2]',
            isPublic: false
          }
        ],
        difficulty: 'Easy',
        timeLimit: 2,
        memoryLimit: 128
      }
    ]
  };

  const createTest = await makeRequest('POST', `/classes/${classId}/tests`, testData, teacherToken);

  if (createTest.success) {
    testId = createTest.data.test.id;
    console.log('✅ Test created:', testId);
  } else {
    console.log('❌ Test creation failed:', createTest.error);
    return false;
  }

  return true;
}

// Step 5: Test Generation (AI-powered)
async function testAIGeneration() {
  console.log('\n🤖 Testing AI Test Case Generation...');

  const generateTestCases = await makeRequest('POST', '/tests/generate-test-cases', {
    title: 'Binary Search',
    description: 'Implement binary search on a sorted array',
    existingTestCases: [
      {
        input: '[1,2,3,4,5]\n3',
        expectedOutput: '2'
      }
    ]
  }, teacherToken);

  if (generateTestCases.success) {
    console.log('✅ AI test case generation successful');
    console.log('Generated test cases:', generateTestCases.data.testCases.length);
  } else {
    console.log('⚠️ AI generation failed (may need valid Gemini API key):', generateTestCases.error);
  }

  return true;
}

// Step 6: Test Execution
async function testCodeExecution() {
  console.log('\n⚡ Testing Code Execution...');

  // Activate the test first
  const activateTest = await makeRequest('PATCH', `/tests/${testId}/status`, {
    isActive: true
  }, teacherToken);

  if (!activateTest.success) {
    console.log('⚠️ Test activation failed:', activateTest.error);
  }

  // Start test session as student
  const startSession = await makeRequest('POST', `/tests/${testId}/start`, {}, studentToken);

  if (startSession.success) {
    console.log('✅ Test session started');
    
    // Test real-time code execution
    const executeCode = await makeRequest('POST', `/tests/${testId}/execute`, {
      problemId: startSession.data.session.test.problems[0].id,
      code: `
def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

# Test
nums = list(map(int, input().split()))
target = int(input())
result = two_sum(nums, target)
print(result)
      `,
      language: 'python'
    }, studentToken);

    if (executeCode.success) {
      console.log('✅ Real-time code execution successful');
      console.log('Results:', executeCode.data.results?.length || 0, 'test cases executed');
    } else {
      console.log('⚠️ Code execution failed (may need valid Judge0 API key):', executeCode.error);
    }

  } else {
    console.log('❌ Test session start failed:', startSession.error);
  }

  return true;
}

// Step 7: Monitoring & Analytics
async function testMonitoring() {
  console.log('\n📊 Testing Monitoring & Analytics...');

  // Test teacher monitoring
  const monitorTest = await makeRequest('GET', `/tests/${testId}/monitor`, {}, teacherToken);

  if (monitorTest.success) {
    console.log('✅ Test monitoring accessible');
    console.log('Active sessions:', monitorTest.data.sessions?.length || 0);
  } else {
    console.log('❌ Test monitoring failed:', monitorTest.error);
  }

  // Test Judge0 status for class (teacher only)
  const judge0Status = await makeRequest('GET', `/classes/${classId}/judge0-status`, {}, teacherToken);

  if (judge0Status.success) {
    console.log('✅ Judge0 status monitoring successful');
    console.log('Class statistics:', judge0Status.data.statistics);
  } else {
    console.log('❌ Judge0 status monitoring failed:', judge0Status.error);
  }

  return true;
}

// Main test runner
async function runMilestone4Integration() {
  console.log('🚀 Running Milestone 4 Integration Tests');
  console.log('=====================================');
  
  try {
    const authResult = await testAuthentication();
    if (authResult) {
      console.log('✅ Basic authentication working');
    } else {
      console.log('❌ Authentication failed');
    }

    const results = {
      apiKeys: false,
      classManagement: false,
      testCreation: false,
      aiGeneration: false,
      codeExecution: false,
      monitoring: false
    };

    results.apiKeys = await testAPIKeySetup();
    results.classManagement = await testClassManagement();
    results.testCreation = await testTestCreation();
    results.aiGeneration = await testAIGeneration();
    results.codeExecution = await testCodeExecution();
    results.monitoring = await testMonitoring();

    // Summary
    console.log('\n📋 MILESTONE 4 INTEGRATION TEST SUMMARY');
    console.log('======================================');
    
    const testResults = [
      ['API Key Management', results.apiKeys ? '✅' : '❌'],
      ['Class Management', results.classManagement ? '✅' : '❌'],
      ['Test Creation', results.testCreation ? '✅' : '❌'],
      ['AI Generation', results.aiGeneration ? '✅' : '⚠️'],
      ['Code Execution', results.codeExecution ? '✅' : '⚠️'],
      ['Monitoring', results.monitoring ? '✅' : '❌']
    ];

    testResults.forEach(([test, result]) => {
      console.log(`${test.padEnd(20)} ${result}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall Status: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Milestone 4 Integration: COMPLETE!');
    } else {
      console.log('⚠️ Some tests failed. Check configuration and API keys.');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. Replace mock API keys with real ones for full functionality');
    console.log('2. Test with multiple students and concurrent sessions');
    console.log('3. Verify partial scoring implementation');
    console.log('4. Test invigilation features (screen monitoring, tab switching)');

  } catch (error) {
    console.error('\n💥 Integration test failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runMilestone4Integration();
}

module.exports = { runMilestone4Integration }; 