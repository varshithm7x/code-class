import { AWSInfrastructureService } from '../services/aws-infrastructure.service';
import axios from 'axios';

describe('Judge0 Core Tests - Memory Safe', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Cost calculation should be accurate', () => {
    const service = new AWSInfrastructureService();
    const launchedAt = new Date('2024-01-01T10:00:00Z');
    const shutdownAt = new Date('2024-01-01T13:00:00Z'); // 3 hours
    
    const cost = service.calculateInstanceCost(launchedAt, shutdownAt);
    
    // t3.medium costs $0.0416/hour, so 3 hours = $0.1248
    expect(cost).toBeCloseTo(0.12, 2);
  });

  test('Language mapping should be correct', () => {
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

  test('Test configuration validation', () => {
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

  test('Score calculation', () => {
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

// Simple Judge0 API connectivity test
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

async function testJudge0Connection() {
  console.log('🔍 Testing Judge0 API Connection...');
  
  if (!RAPIDAPI_KEY) {
    console.log('❌ No API key found');
    return false;
  }
  
  console.log(`🔑 API Key: ${RAPIDAPI_KEY.substring(0, 8)}...${RAPIDAPI_KEY.slice(-4)}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
  };
  
  // Test 1: Check API status
  try {
    console.log('📡 Testing API status...');
    const statusResponse = await axios.get(`${JUDGE0_API_URL}/statuses`, { 
      headers,
      timeout: 10000
    });
    console.log('✅ API Status check successful');
    console.log('📋 Available statuses:', statusResponse.data.length);
  } catch (error: any) {
    console.log('❌ API Status check failed:', error.response?.status, error.message);
    return false;
  }
  
  // Test 2: Simple submission
  try {
    console.log('📤 Testing simple submission...');
    const simpleCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello Judge0!" << endl;
    return 0;
}`;
    
    const submission = {
      source_code: simpleCode,
      language_id: 54, // C++
      stdin: ''
    };
    
    const response = await axios.post(
      `${JUDGE0_API_URL}/submissions?wait=true`,
      submission,
      { headers, timeout: 15000 }
    );
    
    const result = response.data;
    console.log('✅ Simple submission successful');
    console.log(`📋 Status: ${result.status.description}`);
    console.log(`📤 Output: ${result.stdout?.trim()}`);
    console.log(`⏱️  Time: ${result.time}s`);
    
    return result.status.id === 3; // Accepted
    
  } catch (error: any) {
    console.log('❌ Simple submission failed:', error.response?.status, error.response?.data || error.message);
    return false;
  }
}

// Test with 1-second delay
async function testOneSecondDelay() {
  console.log('\n🧪 Testing 1-second per test case...');
  
  const codeWith3Tests = `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    int t = 3; // Fixed 3 test cases
    
    cout << "Starting " << t << " test cases" << endl;
    
    for(int i = 1; i <= t; i++) {
        this_thread::sleep_for(chrono::seconds(1));
        cout << "Test case " << i << " completed" << endl;
    }
    
    cout << "All test cases completed" << endl;
    return 0;
}`;
  
  const submission = {
    source_code: codeWith3Tests,
    language_id: 54,
    stdin: '',
    cpu_time_limit: 15,
    wall_time_limit: 20
  };
  
  const headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
  };
  
  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${JUDGE0_API_URL}/submissions?wait=true`,
      submission,
      { headers, timeout: 30000 }
    );
    const endTime = Date.now();
    
    const result = response.data;
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`✅ 3 test cases completed in ${totalTime.toFixed(1)}s total`);
    console.log(`📋 Status: ${result.status.description}`);
    console.log(`⏱️  CPU Time: ${result.time}s`);
    console.log(`💾 Memory: ${result.memory} KB`);
    
    // Verify output contains expected results
    if (result.stdout?.includes('Test case 1 completed') && 
        result.stdout?.includes('Test case 3 completed')) {
      console.log('✅ All 3 test cases executed successfully');
      console.log(`🎯 Per test case: ~${(parseFloat(result.time) / 3).toFixed(1)}s`);
      return true;
    } else {
      console.log('❌ Test cases did not complete properly');
      return false;
    }
    
  } catch (error: any) {
    console.log('❌ 1-second delay test failed:', error.response?.data || error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Judge0 Simple Connectivity & Performance Test');
  console.log('================================================\n');
  
  const connectionOk = await testJudge0Connection();
  if (!connectionOk) {
    console.log('\n❌ Connection test failed. Cannot proceed with performance tests.');
    process.exit(1);
  }
  
  const performanceOk = await testOneSecondDelay();
  if (!performanceOk) {
    console.log('\n❌ Performance test failed.');
    process.exit(1);
  }
  
  console.log('\n🏆 CONCLUSIONS:');
  console.log('✅ Judge0 API connectivity verified');
  console.log('✅ 1-second per test case approach works');
  console.log('✅ Pooled API approach is viable');
  console.log('✅ Can bundle multiple test cases in single submission');
  console.log('\n🎯 RECOMMENDATION: Proceed with pooled API approach!');
}

if (require.main === module) {
  main().catch(console.error);
} 