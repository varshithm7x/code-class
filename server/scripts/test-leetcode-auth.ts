import { LeetCode, Credential } from 'leetcode-query';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/*
 * Simple test to verify the authentication logic used in the profile controller
 */

async function testAuthenticationFlow() {
  console.log('--- Testing Authentication Flow ---');
  
  const sessionCookie = process.env.LEETCODE_SESSION_COOKIE;
  
  if (!sessionCookie || sessionCookie === 'your_copied_cookie_value_here') {
    console.warn('⚠️ LEETCODE_SESSION_COOKIE not found in .env file.');
    console.warn('Add your LeetCode session cookie to test authentication.');
    return;
  }

  try {
    console.log('🔐 Testing credential initialization...');
    const credential = new Credential();
    await credential.init(sessionCookie);
    console.log('✅ Credential initialization successful');

    console.log('🤖 Creating authenticated LeetCode instance...');
    const leetcode = new LeetCode(credential);
    console.log('✅ LeetCode instance created');

    console.log('📊 Testing submissions fetch (same as profile controller)...');
    const testSubmissions = await leetcode.submissions({ limit: 1, offset: 0 });
    
    if (!testSubmissions) {
      console.error('❌ No submissions returned');
      return;
    }

    console.log('✅ Authentication test successful!');
    console.log(`📈 Submissions object exists:`, typeof testSubmissions);
    console.log(`📊 Has submissions array:`, !!(testSubmissions as any).submissions);
    console.log(`📋 Number of submissions:`, (testSubmissions as any).submissions?.length || 0);
    
  } catch (error: any) {
    console.error('❌ Authentication test failed:', error.message);
    
    if (error.message.includes('401') || error.message.includes('authentication')) {
      console.log('💡 This suggests the cookie is invalid or expired');
    }
  }
}

testAuthenticationFlow(); 