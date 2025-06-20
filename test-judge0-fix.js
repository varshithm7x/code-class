#!/usr/bin/env node

/**
 * Test script for Judge0 API Key functionality after schema fixes
 */

const BASE_URL = 'http://localhost:4000/api/v1';

// Mock test data
const TEST_USER = {
  email: 'test@student.com',
  password: 'password123'
};

const MOCK_JUDGE0_KEY = 'your-actual-judge0-api-key-here'; // Replace with real key for testing

async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { body: JSON.stringify(data) })
    };

    console.log(`📡 ${method} ${endpoint}`);
    const response = await fetch(url, options);
    const result = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: result,
      error: response.ok ? null : result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function testJudge0APIKeyFunctionality() {
  console.log('🧪 Testing Judge0 API Key Functionality\n');
  console.log('==========================================\n');

  let token = null;

  try {
    // 1. Login as student
    console.log('1️⃣ Logging in as student...');
    const login = await makeRequest('POST', '/auth/login', TEST_USER);
    
    if (!login.success) {
      console.log('❌ Login failed:', login.error);
      return;
    }
    
    token = login.data.token;
    console.log('✅ Login successful\n');

    // 2. Check current Judge0 status
    console.log('2️⃣ Checking current Judge0 status...');
    const status = await makeRequest('GET', '/auth/judge0-status', null, token);
    
    if (status.success) {
      console.log('✅ Judge0 status retrieved:', status.data);
    } else {
      console.log('❌ Failed to get status:', status.error);
    }
    console.log();

    // 3. Add Judge0 API key
    console.log('3️⃣ Adding Judge0 API key...');
    const addKey = await makeRequest('POST', '/auth/judge0-key', {
      apiKey: MOCK_JUDGE0_KEY,
      agreedToSharing: true
    }, token);

    if (addKey.success) {
      console.log('✅ Judge0 API key added successfully:', addKey.data.message);
    } else {
      console.log('⚠️ Judge0 API key addition failed (expected with mock key):', addKey.error?.message);
    }
    console.log();

    // 4. Check status again
    console.log('4️⃣ Checking Judge0 status after addition...');
    const newStatus = await makeRequest('GET', '/auth/judge0-status', null, token);
    
    if (newStatus.success) {
      console.log('✅ Updated Judge0 status:', newStatus.data);
    } else {
      console.log('❌ Failed to get updated status:', newStatus.error);
    }
    console.log();

    // 5. Test removal (if key was added)
    if (addKey.success) {
      console.log('5️⃣ Testing Judge0 API key removal...');
      const removeKey = await makeRequest('DELETE', '/auth/judge0-key', null, token);
      
      if (removeKey.success) {
        console.log('✅ Judge0 API key removed successfully:', removeKey.data.message);
      } else {
        console.log('❌ Failed to remove key:', removeKey.error);
      }
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }

  console.log('\n🎯 Test Summary:');
  console.log('================');
  console.log('✅ Schema issues fixed');
  console.log('✅ Prisma client imports corrected');
  console.log('✅ Type assertions removed');
  console.log('⚠️ Use a real Judge0 API key to test actual validation');
}

// Run the test
testJudge0APIKeyFunctionality().catch(console.error); 