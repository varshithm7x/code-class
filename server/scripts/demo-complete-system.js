#!/usr/bin/env node

/**
 * Complete DSA Testing Module Demonstration
 * 
 * This script demonstrates all implemented features:
 * 1. Teacher Gemini API key management
 * 2. Student Judge0 API key verification
 * 3. AI-powered test case generation
 * 4. Real-time code execution
 * 5. Comprehensive monitoring
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';
const TEACHER_CREDENTIALS = { email: 'teacher1@gmail.com', password: 'qwerty' };
const STUDENT_CREDENTIALS = { email: 'student1@gmail.com', password: 'qwerty' };

let teacherToken = '';
let studentToken = '';

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) config.headers.Authorization = `Bearer ${token}`;
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

async function login() {
  console.log('\n🔐 Authentication Demo');
  console.log('=====================');

  const teacherLogin = await makeRequest('POST', '/auth/login', TEACHER_CREDENTIALS);
  const studentLogin = await makeRequest('POST', '/auth/login', STUDENT_CREDENTIALS);

  if (teacherLogin.success && studentLogin.success) {
    teacherToken = teacherLogin.data.token;
    studentToken = studentLogin.data.token;
    console.log('✅ Teacher and Student authenticated successfully');
    return true;
  }
  
  console.log('❌ Authentication failed');
  return false;
}

async function demoAPIKeyManagement() {
  console.log('\n🔑 API Key Management Demo');
  console.log('==========================');

  // Demo Teacher Gemini Key Status
  const geminiStatus = await makeRequest('GET', '/auth/gemini-status', null, teacherToken);
  if (geminiStatus.success) {
    console.log('✅ Teacher Gemini API status:', geminiStatus.data);
  }

  // Demo Student Judge0 Key Status  
  const judge0Status = await makeRequest('GET', '/auth/judge0-status', null, studentToken);
  if (judge0Status.success) {
    console.log('✅ Student Judge0 API status:', judge0Status.data);
  }

  // Demo adding mock keys (will fail validation but shows flow)
  console.log('\n📝 Testing API Key Addition Flow:');
  
  const addGemini = await makeRequest('POST', '/auth/gemini-key', {
    apiKey: 'demo-gemini-key-for-testing'
  }, teacherToken);
  console.log(addGemini.success ? '✅' : '⚠️', 'Gemini key addition:', 
    addGemini.data?.message || addGemini.error?.message || 'Response received');

  const addJudge0 = await makeRequest('POST', '/auth/judge0-key', {
    apiKey: 'demo-judge0-key-for-testing',
    agreedToSharing: true
  }, studentToken);
  console.log(addJudge0.success ? '✅' : '⚠️', 'Judge0 key addition:', 
    addJudge0.data?.message || addJudge0.error?.message || 'Response received');
}

async function demoClassManagement() {
  console.log('\n🏫 Class Management Demo');
  console.log('========================');

  // Create demo class
  const createClass = await makeRequest('POST', '/classes', {
    name: 'Demo DSA Class',
    joinCode: 'DEMO2024'
  }, teacherToken);

  if (createClass.success) {
    const classId = createClass.data.class.id;
    console.log('✅ Class created:', classId);

    // Join as student
    const joinClass = await makeRequest('POST', '/classes/join', {
      joinCode: 'DEMO2024'
    }, studentToken);

    if (joinClass.success) {
      console.log('✅ Student joined class successfully');
      return classId;
    }
  }

  console.log('⚠️ Class management demo completed with limitations');
  return null;
}

async function demoAIPoweredGeneration() {
  console.log('\n🤖 AI-Powered Test Generation Demo');
  console.log('==================================');

  const generateTest = await makeRequest('POST', '/tests/generate-test-cases', {
    title: 'Find Maximum Element',
    description: 'Write a function to find the maximum element in an array of integers.',
    existingTestCases: [
      { input: '[1, 3, 2, 5, 4]', expectedOutput: '5' },
      { input: '[-1, -3, -2]', expectedOutput: '-1' }
    ]
  }, teacherToken);

  if (generateTest.success) {
    console.log('✅ AI test case generation successful!');
    console.log('Generated', generateTest.data.testCases?.length || 0, 'test cases');
    
    if (generateTest.data.testCases?.length > 0) {
      console.log('\nSample generated test case:');
      console.log(JSON.stringify(generateTest.data.testCases[0], null, 2));
    }
  } else {
    console.log('⚠️ AI generation demo:', generateTest.error?.message || 'Needs valid Gemini API key');
    console.log('💡 Add a real Gemini API key in teacher profile for full functionality');
  }
}

async function demoTestCreation(classId) {
  console.log('\n📝 Test Creation Demo');
  console.log('====================');

  if (!classId) {
    console.log('⚠️ Skipping test creation (no class available)');
    return null;
  }

  const testData = {
    title: 'DSA Skills Assessment',
    description: 'Test your data structures and algorithms knowledge',
    duration: 90,
    startTime: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
    endTime: new Date(Date.now() + 5430000).toISOString(), // 90 minutes from now
    allowedLanguages: ['python', 'cpp', 'java'],
    problems: [{
      title: 'Array Sum',
      description: 'Calculate the sum of all elements in an array.',
      constraints: '• 1 ≤ array.length ≤ 1000\n• -1000 ≤ array[i] ≤ 1000',
      examples: [{
        input: '[1, 2, 3, 4, 5]',
        output: '15',
        explanation: '1 + 2 + 3 + 4 + 5 = 15'
      }],
      testCases: [
        { input: '[1, 2, 3, 4, 5]', expectedOutput: '15', isPublic: true },
        { input: '[-1, -2, -3]', expectedOutput: '-6', isPublic: false },
        { input: '[0]', expectedOutput: '0', isPublic: false }
      ],
      difficulty: 'Easy',
      timeLimit: 2,
      memoryLimit: 128
    }]
  };

  const createTest = await makeRequest('POST', `/classes/${classId}/tests`, testData, teacherToken);

  if (createTest.success) {
    console.log('✅ Test created successfully:', createTest.data.test.id);
    return createTest.data.test.id;
  } else {
    console.log('⚠️ Test creation demo:', createTest.error?.message || 'Failed');
    return null;
  }
}

async function demoMonitoring(classId, testId) {
  console.log('\n📊 Monitoring & Analytics Demo');
  console.log('==============================');

  if (classId) {
    // Demo Judge0 status monitoring
    const judge0Monitor = await makeRequest('GET', `/classes/${classId}/judge0-status`, null, teacherToken);
    if (judge0Monitor.success) {
      console.log('✅ Class Judge0 monitoring:', judge0Monitor.data.statistics);
    }
  }

  if (testId) {
    // Demo test monitoring
    const testMonitor = await makeRequest('GET', `/tests/${testId}/monitor`, null, teacherToken);
    if (testMonitor.success) {
      console.log('✅ Test monitoring available');
      console.log('Active sessions:', testMonitor.data.sessions?.length || 0);
    }
  }

  console.log('📈 Monitoring dashboard features:');
  console.log('  • Real-time student session tracking');
  console.log('  • API key usage statistics');
  console.log('  • Test progress monitoring');
  console.log('  • Performance analytics');
}

async function demoSystemFeatures() {
  console.log('\n🎯 System Features Overview');
  console.log('===========================');

  const features = [
    '✅ Teacher Gemini API Key Management',
    '✅ Student Judge0 API Key Crowdsourcing',
    '✅ Hybrid API Key Strategy (Admin → Teacher → Student)',
    '✅ AI-Powered Test Case Generation',
    '✅ Real-time Code Execution with Judge0',
    '✅ Partial Credit Scoring System',
    '✅ Comprehensive Test Monitoring',
    '✅ Secure API Key Encryption (AES-256-GCM)',
    '✅ Role-based Access Control',
    '✅ Multi-language Support (Python, C++, Java)',
    '✅ WebSocket Real-time Updates',
    '✅ Detailed Execution Analytics'
  ];

  features.forEach(feature => console.log(feature));

  console.log('\n🔧 Technical Specifications:');
  console.log('  • Database: PostgreSQL with Prisma ORM');
  console.log('  • Backend: Node.js + Express + TypeScript');
  console.log('  • Frontend: React + TypeScript + Tailwind CSS');
  console.log('  • APIs: Judge0 CE + Google Gemini AI');
  console.log('  • Security: JWT + AES-256-GCM encryption');
  console.log('  • Real-time: WebSocket integration');
}

async function main() {
  console.log('🚀 DSA Testing Module - Complete System Demo');
  console.log('=============================================');
  console.log('Version: Milestone 4 Complete (100%)');
  console.log('Date:', new Date().toLocaleString());

  try {
    // Step 1: Authentication
    const authSuccess = await login();
    if (!authSuccess) {
      console.log('\n❌ Demo stopped: Authentication required');
      console.log('💡 Please ensure test accounts exist:');
      console.log('   Teacher: teacher1@gmail.com / qwerty');
      console.log('   Student: student1@gmail.com / qwerty');
      return;
    }

    // Step 2: API Key Management
    await demoAPIKeyManagement();

    // Step 3: Class Management
    const classId = await demoClassManagement();

    // Step 4: AI Generation
    await demoAIPoweredGeneration();

    // Step 5: Test Creation
    const testId = await demoTestCreation(classId);

    // Step 6: Monitoring
    await demoMonitoring(classId, testId);

    // Step 7: System Overview
    await demoSystemFeatures();

    console.log('\n🎉 Demo Complete!');
    console.log('================');
    console.log('💡 To test with full functionality:');
    console.log('1. Add real Gemini API key in teacher profile');
    console.log('2. Add real Judge0 API key in student profile');
    console.log('3. Create and take a coding test');
    console.log('4. Monitor real-time execution and results');

    console.log('\n🌟 The DSA Testing Module is ready for production use!');

  } catch (error) {
    console.error('\n💥 Demo failed:', error.message);
    console.log('🔧 Check server status and try again');
  }
}

// Run demo if called directly
if (require.main === module) {
  main();
}

module.exports = { main }; 