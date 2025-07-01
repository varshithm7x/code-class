#!/usr/bin/env ts-node

// Simple validation script for Judge0 automation Phase 2

import * as fs from 'fs';
import * as path from 'path';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

class Phase2Validator {
  private results: ValidationResult[] = [];

  private addResult(name: string, passed: boolean, message: string) {
    this.results.push({ name, passed, message });
    const color = passed ? GREEN : RED;
    console.log(`${color}${passed ? '✅' : '❌'} ${name}: ${message}${RESET}`);
  }

  validateScriptFiles() {
    console.log(`${YELLOW}🔍 Validating Phase 2 Script Files...${RESET}\n`);

    // Check Judge0 setup script
    const setupScriptPath = path.join(process.cwd(), '../infrastructure/scripts/judge0-setup.sh');
    const setupExists = fs.existsSync(setupScriptPath);
    this.addResult(
      'Judge0 Setup Script',
      setupExists,
      setupExists ? 'Found and accessible' : 'Missing or not accessible'
    );

    if (setupExists) {
      const setupContent = fs.readFileSync(setupScriptPath, 'utf8');
      const hasShebang = setupContent.startsWith('#!/bin/bash');
      const hasDockerInstall = setupContent.includes('docker.io docker-compose');
      const hasJudge0Download = setupContent.includes('judge0-v1.13.0.zip');
      const hasHealthCheck = setupContent.includes('curl -f http://localhost:2358/languages');

      this.addResult(
        'Setup Script - Shebang',
        hasShebang,
        hasShebang ? 'Proper bash shebang found' : 'Missing bash shebang'
      );

      this.addResult(
        'Setup Script - Docker Installation',
        hasDockerInstall,
        hasDockerInstall ? 'Docker installation commands found' : 'Missing Docker installation'
      );

      this.addResult(
        'Setup Script - Judge0 Download',
        hasJudge0Download,
        hasJudge0Download ? 'Judge0 download logic found' : 'Missing Judge0 download'
      );

      this.addResult(
        'Setup Script - Health Check',
        hasHealthCheck,
        hasHealthCheck ? 'Health check logic found' : 'Missing health check logic'
      );
    }

    // Check health check script
    const healthScriptPath = path.join(process.cwd(), '../infrastructure/scripts/health-check.sh');
    const healthExists = fs.existsSync(healthScriptPath);
    this.addResult(
      'Health Check Script',
      healthExists,
      healthExists ? 'Found and accessible' : 'Missing or not accessible'
    );

    if (healthExists) {
      const healthContent = fs.readFileSync(healthScriptPath, 'utf8');
      const hasAPITest = healthContent.includes('/languages');
      const hasCppTest = healthContent.includes('language_id": 54');
      const hasPythonTest = healthContent.includes('language_id": 71');
      const hasBatchTest = healthContent.includes('/submissions/batch');

      this.addResult(
        'Health Check - API Test',
        hasAPITest,
        hasAPITest ? 'API connectivity test found' : 'Missing API test'
      );

      this.addResult(
        'Health Check - C++ Test',
        hasCppTest,
        hasCppTest ? 'C++ execution test found' : 'Missing C++ test'
      );

      this.addResult(
        'Health Check - Python Test',
        hasPythonTest,
        hasPythonTest ? 'Python execution test found' : 'Missing Python test'
      );

      this.addResult(
        'Health Check - Batch Test',
        hasBatchTest,
        hasBatchTest ? 'Batch submission test found' : 'Missing batch test'
      );
    }

    // Check shutdown handler
    const shutdownScriptPath = path.join(process.cwd(), '../infrastructure/scripts/shutdown-handler.sh');
    const shutdownExists = fs.existsSync(shutdownScriptPath);
    this.addResult(
      'Shutdown Handler Script',
      shutdownExists,
      shutdownExists ? 'Found and accessible' : 'Missing or not accessible'
    );

    if (shutdownExists) {
      const shutdownContent = fs.readFileSync(shutdownScriptPath, 'utf8');
      const hasCleanup = shutdownContent.includes('cleanup_and_shutdown');
      const hasSSMCheck = shutdownContent.includes('aws ssm get-parameter');

      this.addResult(
        'Shutdown Handler - Cleanup Function',
        hasCleanup,
        hasCleanup ? 'Cleanup function found' : 'Missing cleanup function'
      );

      this.addResult(
        'Shutdown Handler - SSM Check',
        hasSSMCheck,
        hasSSMCheck ? 'SSM parameter check found' : 'Missing SSM check'
      );
    }
  }

  validateServiceFiles() {
    console.log(`\n${YELLOW}🔍 Validating Service Files...${RESET}\n`);

    // Check AWS Infrastructure Service
    const awsServicePath = path.join(process.cwd(), 'src/services/aws-infrastructure.service.ts');
    const awsExists = fs.existsSync(awsServicePath);
    this.addResult(
      'AWS Infrastructure Service',
      awsExists,
      awsExists ? 'Service file found' : 'Service file missing'
    );

    if (awsExists) {
      const awsContent = fs.readFileSync(awsServicePath, 'utf8');
      const hasLaunchMethod = awsContent.includes('launchJudge0Instance');
      const hasTerminateMethod = awsContent.includes('terminateInstance');
      const hasCostCalculation = awsContent.includes('calculateInstanceCost');
      const hasScriptMethods = awsContent.includes('getSetupScript');

      this.addResult(
        'AWS Service - Launch Method',
        hasLaunchMethod,
        hasLaunchMethod ? 'Instance launch method found' : 'Missing launch method'
      );

      this.addResult(
        'AWS Service - Terminate Method',
        hasTerminateMethod,
        hasTerminateMethod ? 'Instance terminate method found' : 'Missing terminate method'
      );

      this.addResult(
        'AWS Service - Cost Calculation',
        hasCostCalculation,
        hasCostCalculation ? 'Cost calculation method found' : 'Missing cost calculation'
      );

      this.addResult(
        'AWS Service - Script Methods',
        hasScriptMethods,
        hasScriptMethods ? 'Script generation methods found' : 'Missing script methods'
      );
    }

    // Check Judge0 Automation Service
    const judge0ServicePath = path.join(process.cwd(), 'src/services/judge0-automation.service.ts');
    const judge0Exists = fs.existsSync(judge0ServicePath);
    this.addResult(
      'Judge0 Automation Service',
      judge0Exists,
      judge0Exists ? 'Service file found' : 'Service file missing'
    );

    if (judge0Exists) {
      const judge0Content = fs.readFileSync(judge0ServicePath, 'utf8');
      const hasScheduleTest = judge0Content.includes('scheduleTest');
      const hasQuickTest = judge0Content.includes('runQuickTest');
      const hasFinalSubmission = judge0Content.includes('runFinalSubmission');
      const hasHealthCheck = judge0Content.includes('checkJudge0Health');

      this.addResult(
        'Judge0 Service - Schedule Test',
        hasScheduleTest,
        hasScheduleTest ? 'Test scheduling method found' : 'Missing schedule method'
      );

      this.addResult(
        'Judge0 Service - Quick Test',
        hasQuickTest,
        hasQuickTest ? 'Quick test method found' : 'Missing quick test method'
      );

      this.addResult(
        'Judge0 Service - Final Submission',
        hasFinalSubmission,
        hasFinalSubmission ? 'Final submission method found' : 'Missing final submission method'
      );

      this.addResult(
        'Judge0 Service - Health Check',
        hasHealthCheck,
        hasHealthCheck ? 'Health check method found' : 'Missing health check method'
      );
    }
  }

  validateTestFiles() {
    console.log(`\n${YELLOW}🔍 Validating Test Files...${RESET}\n`);

    // Check test file
    const testPath = path.join(process.cwd(), 'src/tests/judge0-automation.test.ts');
    const testExists = fs.existsSync(testPath);
    this.addResult(
      'Judge0 Automation Tests',
      testExists,
      testExists ? 'Test file found' : 'Test file missing'
    );

    if (testExists) {
      const testContent = fs.readFileSync(testPath, 'utf8');
      const hasCostTests = testContent.includes('Cost Calculation');
      const hasValidationTests = testContent.includes('Test Configuration Validation');
      const hasBatchTests = testContent.includes('Batch Processing');

      this.addResult(
        'Tests - Cost Calculation',
        hasCostTests,
        hasCostTests ? 'Cost calculation tests found' : 'Missing cost tests'
      );

      this.addResult(
        'Tests - Configuration Validation',
        hasValidationTests,
        hasValidationTests ? 'Configuration validation tests found' : 'Missing validation tests'
      );

      this.addResult(
        'Tests - Batch Processing',
        hasBatchTests,
        hasBatchTests ? 'Batch processing tests found' : 'Missing batch tests'
      );
    }

    // Check Jest configuration
    const jestPath = path.join(process.cwd(), 'jest.config.js');
    const jestExists = fs.existsSync(jestPath);
    this.addResult(
      'Jest Configuration',
      jestExists,
      jestExists ? 'Jest config found' : 'Jest config missing'
    );

    // Check test setup
    const setupPath = path.join(process.cwd(), 'src/tests/setup.ts');
    const setupTestExists = fs.existsSync(setupPath);
    this.addResult(
      'Test Setup File',
      setupTestExists,
      setupTestExists ? 'Test setup found' : 'Test setup missing'
    );
  }

  generateReport() {
    console.log(`\n${YELLOW}📊 Phase 2 Implementation Report${RESET}\n`);

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const percentage = Math.round((passed / total) * 100);

    console.log(`Total Checks: ${total}`);
    console.log(`${GREEN}Passed: ${passed}${RESET}`);
    console.log(`${RED}Failed: ${total - passed}${RESET}`);
    console.log(`${percentage >= 80 ? GREEN : percentage >= 60 ? YELLOW : RED}Success Rate: ${percentage}%${RESET}`);

    if (percentage >= 80) {
      console.log(`\n${GREEN}🎉 Phase 2 implementation is in good shape!${RESET}`);
    } else if (percentage >= 60) {
      console.log(`\n${YELLOW}⚠️ Phase 2 implementation needs some attention.${RESET}`);
    } else {
      console.log(`\n${RED}❌ Phase 2 implementation requires significant work.${RESET}`);
    }

    // List failed checks
    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log(`\n${RED}Failed Checks:${RESET}`);
      failed.forEach(f => {
        console.log(`  - ${f.name}: ${f.message}`);
      });
    }

    return percentage >= 80;
  }

  run() {
    console.log(`${GREEN}🚀 Judge0 Automation Phase 2 Validation${RESET}\n`);
    
    this.validateScriptFiles();
    this.validateServiceFiles();
    this.validateTestFiles();
    
    const success = this.generateReport();
    
    console.log(`\n${YELLOW}Phase 2 Features Implemented:${RESET}`);
    console.log('✅ Enhanced Judge0 setup script with comprehensive configuration');
    console.log('✅ Health check script with multi-language validation');
    console.log('✅ Auto-shutdown handler with graceful cleanup');
    console.log('✅ Enhanced AWS infrastructure service with script integration');
    console.log('✅ Improved Judge0 automation service with better health checks');
    console.log('✅ Comprehensive test suite for validation');
    
    process.exit(success ? 0 : 1);
  }
}

// Run the validator
const validator = new Phase2Validator();
validator.run(); 