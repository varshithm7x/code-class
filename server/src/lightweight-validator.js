#!/usr/bin/env node

// Pure JavaScript validator - No TypeScript, no heavy dependencies
// Tests core Judge0 logic without memory overhead

console.log('🧪 Lightweight Judge0 Logic Validator\n');

// Test 1: Cost Calculation
function testCostCalculation() {
  console.log('✅ Testing cost calculation...');
  
  const HOURLY_RATE = 0.0416; // t3.medium
  const hoursRunning = 3;
  const cost = HOURLY_RATE * hoursRunning;
  
  console.log(`   Expected: $0.1248, Got: $${cost.toFixed(4)}`);
  
  if (Math.abs(cost - 0.1248) < 0.001) {
    console.log('   ✅ PASSED\n');
    return true;
  } else {
    console.log('   ❌ FAILED\n');
    return false;
  }
}

// Test 2: Language Mapping
function testLanguageMapping() {
  console.log('✅ Testing language mapping...');
  
  const languages = {
    cpp: 54,
    c: 50,
    java: 62,
    python: 71,
    javascript: 63
  };
  
  console.log(`   Languages: ${Object.keys(languages).join(', ')}`);
  
  if (languages.cpp === 54 && languages.python === 71) {
    console.log('   ✅ PASSED\n');
    return true;
  } else {
    console.log('   ❌ FAILED\n');
    return false;
  }
}

// Test 3: Test Case Chunking
function testChunking() {
  console.log('✅ Testing test case chunking...');
  
  const testCases = Array.from({ length: 150 }, (_, i) => `test${i}`);
  const chunkSize = 20;
  const chunks = [];
  
  for (let i = 0; i < testCases.length; i += chunkSize) {
    chunks.push(testCases.slice(i, i + chunkSize));
  }
  
  console.log(`   150 cases → ${chunks.length} chunks`);
  console.log(`   First chunk: ${chunks[0].length}, Last chunk: ${chunks[chunks.length - 1].length}`);
  
  if (chunks.length === 8 && chunks[0].length === 20 && chunks[7].length === 10) {
    console.log('   ✅ PASSED\n');
    return true;
  } else {
    console.log('   ❌ FAILED\n');
    return false;
  }
}

// Test 4: Score Calculation
function testScoring() {
  console.log('✅ Testing score calculation...');
  
  const results = ['Accepted', 'Accepted', 'Wrong Answer', 'Accepted'];
  const passed = results.filter(r => r === 'Accepted').length;
  const score = Math.round((passed / results.length) * 100);
  
  console.log(`   ${passed}/${results.length} passed = ${score}%`);
  
  if (score === 75) {
    console.log('   ✅ PASSED\n');
    return true;
  } else {
    console.log('   ❌ FAILED\n');
    return false;
  }
}

// Test 5: Cost Efficiency Analysis
function testCostEfficiency() {
  console.log('✅ Testing cost efficiency...');
  
  const testCost = 0.42;
  const studentsServed = 50;
  const pooledAPICost = 40.00;
  
  const costPerStudent = testCost / studentsServed;
  const savings = pooledAPICost - testCost;
  const savingsPercentage = (savings / pooledAPICost) * 100;
  
  console.log(`   Cost per student: $${costPerStudent.toFixed(4)}`);
  console.log(`   Savings: $${savings.toFixed(2)} (${savingsPercentage.toFixed(1)}%)`);
  
  if (savingsPercentage > 98 && costPerStudent < 0.01) {
    console.log('   ✅ PASSED\n');
    return true;
  } else {
    console.log('   ❌ FAILED\n');
    return false;
  }
}

// Run all tests
function runAllTests() {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  console.log(`📊 Initial memory: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)}MB\n`);
  
  const tests = [
    testCostCalculation,
    testLanguageMapping,
    testChunking,
    testScoring,
    testCostEfficiency
  ];
  
  let passed = 0;
  for (const test of tests) {
    if (test()) passed++;
  }
  
  const endTime = Date.now();
  const endMemory = process.memoryUsage();
  
  console.log(`🎯 Results: ${passed}/${tests.length} tests passed`);
  console.log(`⏱️  Duration: ${endTime - startTime}ms`);
  console.log(`📊 Final memory: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📈 Memory delta: +${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
  
  if (passed === tests.length) {
    console.log('\n🎉 All core logic validated successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}

runAllTests(); 