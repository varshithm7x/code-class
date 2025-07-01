#!/usr/bin/env node

/**
 * Local Judge0 Test
 * Tests Judge0 setup locally using Docker to validate configuration
 * before deploying to EC2
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const TEST_CONFIG = {
  testId: `local-test-${Date.now()}`,
  judge0Version: 'v1.13.0',
  maxSetupMinutes: 5,
  testDir: '/tmp/judge0-local-test'
};

// Test code samples
const TEST_SAMPLES = {
  cpp: {
    code: '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello World"; return 0; }',
    languageId: 54,
    expectedOutput: 'Hello World'
  },
  python: {
    code: 'print("Hello World")',
    languageId: 71,
    expectedOutput: 'Hello World'
  }
};

async function checkDockerAvailable() {
  console.log('🐳 Checking Docker availability...');
  
  try {
    const { stdout } = await execAsync('docker --version');
    console.log(`   Docker version: ${stdout.trim()}`);
    
    const { stdout: compose } = await execAsync('docker compose version');
    console.log(`   Docker Compose: ${compose.trim()}`);
    
    // Check if Docker daemon is running
    await execAsync('docker ps');
    console.log('   ✅ Docker daemon is running');
    
    return true;
  } catch (error) {
    console.log(`   ❌ Docker not available: ${error.message}`);
    console.log('   Please install Docker and Docker Compose first');
    return false;
  }
}

async function setupTestDirectory() {
  console.log('📁 Setting up test directory...');
  
  try {
    await execAsync(`rm -rf ${TEST_CONFIG.testDir}`);
    await execAsync(`mkdir -p ${TEST_CONFIG.testDir}`);
    console.log(`   Created: ${TEST_CONFIG.testDir}`);
    
    // Download Judge0
    const downloadCmd = `cd ${TEST_CONFIG.testDir} && wget -q https://github.com/judge0/judge0/releases/download/${TEST_CONFIG.judge0Version}/judge0-${TEST_CONFIG.judge0Version}.zip`;
    await execAsync(downloadCmd);
    console.log(`   Downloaded Judge0 ${TEST_CONFIG.judge0Version}`);
    
    // Extract
    const extractCmd = `cd ${TEST_CONFIG.testDir} && unzip -q judge0-${TEST_CONFIG.judge0Version}.zip`;
    await execAsync(extractCmd);
    console.log(`   Extracted Judge0 files`);
    
    return `${TEST_CONFIG.testDir}/judge0-${TEST_CONFIG.judge0Version}`;
  } catch (error) {
    console.log(`   ❌ Setup failed: ${error.message}`);
    throw error;
  }
}

async function startJudge0Services(judge0Dir) {
  console.log('🚀 Starting Judge0 services...');
  
  try {
    // Start database and Redis first
    const dbCmd = `cd ${judge0Dir} && docker compose up -d db redis`;
    await execAsync(dbCmd);
    console.log('   Started database and Redis');
    
    // Wait for DB to be ready
    console.log('   Waiting for database to be ready...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Start Judge0 API
    const apiCmd = `cd ${judge0Dir} && docker compose up -d`;
    await execAsync(apiCmd);
    console.log('   Started Judge0 API services');
    
    return true;
  } catch (error) {
    console.log(`   ❌ Service startup failed: ${error.message}`);
    throw error;
  }
}

async function waitForJudge0Ready(maxMinutes = 5) {
  console.log('⏳ Waiting for Judge0 API to be ready...');
  
  const maxAttempts = maxMinutes * 6; // Check every 10 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { stdout } = await execAsync('curl -s http://localhost:2358/languages');
      const languages = JSON.parse(stdout);
      
      if (languages && languages.length > 0) {
        console.log(`   ✅ Judge0 API ready! Found ${languages.length} languages`);
        return true;
      }
    } catch (error) {
      // API not ready yet
    }
    
    console.log(`   Status check ${attempt}/${maxAttempts}...`);
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  console.log('   ❌ Judge0 API failed to become ready');
  return false;
}

async function testCodeSubmission() {
  console.log('💻 Testing code submissions...');
  
  const results = [];
  
  for (const [lang, sample] of Object.entries(TEST_SAMPLES)) {
    try {
      console.log(`   Testing ${lang}...`);
      
      // Submit code
      const submitData = {
        source_code: Buffer.from(sample.code).toString('base64'),
        language_id: sample.languageId
      };
      
      const submitCmd = `curl -s -X POST http://localhost:2358/submissions ` +
        `-H "Content-Type: application/json" ` +
        `-d '${JSON.stringify(submitData)}'`;
      
      const { stdout: submitResponse } = await execAsync(submitCmd);
      const submission = JSON.parse(submitResponse);
      
      if (!submission.token) {
        throw new Error('No submission token received');
      }
      
      // Wait for completion
      let completed = false;
      for (let i = 0; i < 30; i++) {
        const { stdout: statusResponse } = await execAsync(`curl -s http://localhost:2358/submissions/${submission.token}`);
        const status = JSON.parse(statusResponse);
        
        if (status.status.id <= 2) { // In Queue or Processing
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        completed = true;
        const success = status.status.id === 3 && // Accepted
                       status.stdout && 
                       Buffer.from(status.stdout, 'base64').toString().trim() === sample.expectedOutput;
        
        results.push({
          language: lang,
          success,
          status: status.status.description,
          output: status.stdout ? Buffer.from(status.stdout, 'base64').toString() : null,
          error: status.stderr ? Buffer.from(status.stderr, 'base64').toString() : null
        });
        
        console.log(`     ${success ? '✅' : '❌'} ${lang}: ${status.status.description}`);
        break;
      }
      
      if (!completed) {
        results.push({
          language: lang,
          success: false,
          status: 'TIMEOUT',
          output: null,
          error: 'Execution timeout'
        });
        console.log(`     ❌ ${lang}: Execution timeout`);
      }
    } catch (error) {
      results.push({
        language: lang,
        success: false,
        status: 'ERROR',
        output: null,
        error: error.message
      });
      console.log(`     ❌ ${lang}: ${error.message}`);
    }
  }
  
  return results;
}

async function cleanup() {
  console.log('🧹 Cleaning up...');
  
  try {
    // Stop containers
    await execAsync(`cd ${TEST_CONFIG.testDir}/judge0-${TEST_CONFIG.judge0Version} && docker compose down`);
    console.log('   Stopped containers');
    
    // Remove test directory
    await execAsync(`rm -rf ${TEST_CONFIG.testDir}`);
    console.log('   Removed test directory');
  } catch (error) {
    console.log(`   ⚠️ Cleanup warning: ${error.message}`);
  }
}

async function runLocalJudge0Test() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  console.log('🏠 Judge0 Local Test');
  console.log(`📊 Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`🎯 Test ID: ${TEST_CONFIG.testId}\n`);
  
  let success = false;
  let results = [];
  
  try {
    // Prerequisites
    if (!(await checkDockerAvailable())) {
      throw new Error('Docker not available');
    }
    
    // Setup
    const judge0Dir = await setupTestDirectory();
    await startJudge0Services(judge0Dir);
    
    // Test
    const apiReady = await waitForJudge0Ready(TEST_CONFIG.maxSetupMinutes);
    if (!apiReady) {
      throw new Error('Judge0 API failed to start');
    }
    
    results = await testCodeSubmission();
    
    // Check results
    const successCount = results.filter(r => r.success).length;
    success = successCount === results.length;
    
    console.log(`\n🎯 Test Results: ${successCount}/${results.length} passed`);
    
    if (success) {
      console.log('✅ LOCAL TEST PASSED! Judge0 setup is working correctly');
    } else {
      console.log('❌ LOCAL TEST FAILED! Issues found:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.language}: ${r.error || r.status}`);
      });
    }
  } catch (error) {
    console.log(`\n💥 LOCAL TEST CRASHED: ${error.message}`);
  } finally {
    await cleanup();
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  console.log(`\n⏱️  Duration: ${Math.round((endTime - startTime) / 1000)}s`);
  console.log(`📊 Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📈 Memory delta: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  
  if (success) {
    console.log('\n🚀 Ready to deploy to EC2 with confidence!');
    process.exit(0);
  } else {
    console.log('\n🔧 Fix local issues before deploying to EC2');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  runLocalJudge0Test();
}

module.exports = { runLocalJudge0Test }; 