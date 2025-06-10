import axios from 'axios';

const API_BASE = 'http://localhost:4000/api/v1';

async function testAuthAndLeaderboard() {
  console.log('🔐 Testing API authentication and leaderboard...');
  
  try {
    // Test 1: Login with an existing user
    console.log('\n1️⃣ Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'parv@gmail.com', // This user exists from our database test
      password: 'password123', // Common test password
    });
    
    if ((loginResponse.data as any).token) {
      console.log('✅ Login successful! Got token.');
      const token = (loginResponse.data as any).token;
      
      // Test 2: Test leaderboard endpoint with token
      console.log('\n2️⃣ Testing leaderboard endpoint...');
      const leaderboardResponse = await axios.get(`${API_BASE}/analytics/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ Leaderboard endpoint works!');
      console.log(`📊 Returned ${(leaderboardResponse.data as any).length} entries`);
      
      // Show first few entries
      const entries = (leaderboardResponse.data as any).slice(0, 5);
      console.log('\n🏆 Top 5 entries:');
      entries.forEach((entry: any, index: number) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.completedCount} assignments, LeetCode: ${entry.leetcodeTotalSolved || 0}`);
      });
      
      // Test 3: Test class-specific leaderboard
      console.log('\n3️⃣ Testing class-specific leaderboard...');
      const classLeaderboardResponse = await axios.get(`${API_BASE}/analytics/leaderboard?classId=cljk1234567890`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`📊 Class leaderboard returned ${(classLeaderboardResponse.data as any).length} entries`);
      
      // Test 4: Test LeetCode sorting
      console.log('\n4️⃣ Testing LeetCode sorting...');
      const leetcodeSortResponse = await axios.get(`${API_BASE}/analytics/leaderboard?sortBy=leetcode`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`📊 LeetCode sorted leaderboard returned ${(leetcodeSortResponse.data as any).length} entries`);
      const leetcodeEntries = (leetcodeSortResponse.data as any).slice(0, 3);
      console.log('\n🥇 Top 3 by LeetCode:');
      leetcodeEntries.forEach((entry: any, index: number) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.leetcodeTotalSolved || 0} LeetCode, ${entry.completedCount} assignments`);
      });
      
    } else {
      console.log('❌ Login failed - no token received');
    }
    
  } catch (error: any) {
    if (error.response) {
      console.log(`❌ API Error: ${error.response.status} - ${error.response.data.message || error.response.statusText}`);
      if (error.response.status === 401) {
        console.log('🔑 Authentication failed. Check credentials or user existence.');
      }
    } else if (error.request) {
      console.log('❌ Network Error: Cannot reach the server');
      console.log('🔧 Make sure the backend server is running on port 4000');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Also test with different credentials
async function testWithMultipleUsers() {
  const testUsers = [
    { email: 'parv@gmail.com', password: 'password123' },
    { email: 'parvisthebest@gmail.com', password: 'password' },
    { email: 'teacher@gmail.com', password: 'password' },
  ];
  
  for (const user of testUsers) {
    console.log(`\n🧪 Testing with ${user.email}...`);
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, user);
      console.log(`✅ ${user.email} login successful`);
      
      // Test leaderboard with this user's token
      const leaderboardResponse = await axios.get(`${API_BASE}/analytics/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${(response.data as any).token}`,
        }
      });
      console.log(`📊 Leaderboard works for ${user.email}: ${(leaderboardResponse.data as any).length} entries`);
      return (response.data as any).token; // Return first working token
      
    } catch (error: any) {
      console.log(`❌ ${user.email} failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  return null;
}

testWithMultipleUsers().then((token) => {
  if (token) {
    console.log('\n🎉 Found working authentication!');
  } else {
    console.log('\n❌ No working authentication found. You may need to create a user first.');
    console.log('💡 Try running: npx ts-node src/scripts/create-test-user.ts');
  }
}); 