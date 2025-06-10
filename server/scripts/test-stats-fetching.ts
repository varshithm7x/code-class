import { fetchAuthenticatedStats } from '../src/services/enhanced-leetcode.service';

const testCookie = process.env.LEETCODE_SESSION_COOKIE || "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJfYXV0aF91c2VyX2lkIjoiOTIxNTE2IiwiX2F1dGhfdXNlcl9iYWNrZW5kIjoiYWxsYXV0aC5hY2NvdW50LmF1dGhfYmFja2VuZHMuQXV0aGVudGljYXRpb25CYWNrZW5kIiwiX2F1dGhfdXNlcl9oYXNoIjoiYWY0Zjg5MTBkYWY1NmM4Y2I1ZmJhMjA2ZWYwZjgwNWU1Y2NiNTI4ZWMyNjcwMWJlZjI1NzYyNjExNTNlNWMxNSIsInNlc3Npb25fdXVpZCI6Ijg5YWM5MmU2IiwiaWQiOjkyMTUxNiwiZW1haWwiOiJwYXJ2aXN0aGViZXN0QGdtYWlsLmNvbSIsInVzZXJuYW1lIjoiRGllX2hhcmQtUFJPR1JBbW1lciIsInVzZXJfc2x1ZyI6IkRpZV9oYXJkLVBST0dSQW1tZXIiLCJhdmF0YXIiOiJodHRwczovL2Fzc2V0cy5sZWV0Y29kZS5jb20vdXNlcnMvZGVmYXVsdF9hdmF0YXIuanBnIiwicmVmcmVzaGVkX2F0IjoxNzQ5NTMyMjA1LCJpcCI6IjI0MDE6NDkwMDo4ZmM3OjEzMzA6Y2I1YTpjNDAyOjY3YzM6ZmQ5ZCIsImlkZW50aXR5IjoiY2Q1ZDVmM2ZmOGYzNzQ4MjcyNDhlMTNkMmY3ZDY0Y2EiLCJkZXZpY2Vfd2l0aF9pcCI6WyI2MzI3NTJlNmE1MzQ1MGJlMDExYzY4MzA4M2VjNzAxOCIsIjI0MDE6NDkwMDo4ZmM3OjEzMzA6Y2I1YTpjNDAyOjY3YzM6ZmQ5ZCJdLCJfc2Vzc2lvbl9leHBpcnkiOjEyMDk2MDB9.wLOa0Vl0oMcC2J22WOlMU0Nvt-2UH3hbX187UI9EOPE";

async function testStatsFunction() {
  console.log('🧪 Testing LeetCode stats fetching...');
  
  try {
    const stats = await fetchAuthenticatedStats(testCookie);
    
    if (stats) {
      console.log('✅ Stats fetched successfully:');
      console.log(`📊 Total Solved: ${stats.totalSolved}`);
      console.log(`🟢 Easy: ${stats.easySolved}`);
      console.log(`🟡 Medium: ${stats.mediumSolved}`);
      console.log(`🔴 Hard: ${stats.hardSolved}`);
    } else {
      console.log('❌ No stats returned');
    }
    
  } catch (error: any) {
    console.error('❌ Error testing stats:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testStatsFunction().then(() => {
  console.log('🎯 Test completed');
}).catch(error => {
  console.error('💥 Unexpected error:', error);
}); 