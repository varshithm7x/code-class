const axios = require('axios');

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
};

function generateOptimizedMatrixCode(size) {
  return `
#include <iostream>
#include <vector>
#include <chrono>
using namespace std;

int main() {
    auto start = chrono::high_resolution_clock::now();
    
    int n = ${size};
    cout << "Starting matrix multiplication " << n << "x" << n << endl;
    
    // Initialize matrices
    vector<vector<double>> A(n, vector<double>(n));
    vector<vector<double>> B(n, vector<double>(n));
    vector<vector<double>> C(n, vector<double>(n, 0));
    
    // Fill matrices with data
    for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
            A[i][j] = (i + j + 1) * 1.5;
            B[i][j] = (i * j + 1) * 0.7;
        }
    }
    
    // Matrix multiplication with more operations
    for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
            for(int k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    
    auto end = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    
    // Sum the result to ensure no optimization
    double sum = 0;
    for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
            sum += C[i][j];
        }
    }
    
    cout << "Matrix multiplication completed in " << duration.count() << "ms" << endl;
    cout << "Matrix sum: " << sum << endl;
    cout << "Test case completed" << endl;
    
    return 0;
}`;
}

function generateIntensiveComputationCode(operations) {
  return `
#include <iostream>
#include <cmath>
#include <chrono>
using namespace std;

int main() {
    auto start = chrono::high_resolution_clock::now();
    
    cout << "Starting intensive computation with " << ${operations} << " operations" << endl;
    
    double result = 1.0;
    long long ops = ${operations};
    
    for(long long i = 1; i <= ops; i++) {
        // Mix of floating point operations
        result += sqrt(i) * sin(i % 1000) + cos(i % 1000);
        result = fmod(result, 1000000.0); // Keep numbers manageable
        
        if(i % 1000000 == 0) {
            cout << "Completed " << i << " operations" << endl;
        }
    }
    
    auto end = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    
    cout << "Computation completed in " << duration.count() << "ms" << endl;
    cout << "Final result: " << result << endl;
    cout << "Test case completed" << endl;
    
    return 0;
}`;
}

async function calibrateAlgorithm(sourceCode, description, parameter) {
  console.log(`\n🧪 Calibrating: ${description}`);
  
  const submission = {
    source_code: sourceCode,
    language_id: 54,
    stdin: '',
    cpu_time_limit: 15,
    wall_time_limit: 20,
    memory_limit: 256000
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
    const wallTime = (endTime - startTime) / 1000;
    const cpuTime = parseFloat(result.time);
    
    console.log(`📊 Results:`);
    console.log(`   • Status: ${result.status.description}`);
    console.log(`   • CPU Time: ${cpuTime}s`);
    console.log(`   • Wall Time: ${wallTime.toFixed(1)}s`);
    console.log(`   • Memory: ${result.memory} KB`);
    console.log(`   • Parameter: ${parameter}`);
    
    // Calculate accuracy
    const accuracy = Math.abs(cpuTime - 1.0);
    const rating = accuracy < 0.1 ? 'EXCELLENT' : 
                   accuracy < 0.2 ? 'VERY GOOD' : 
                   accuracy < 0.3 ? 'GOOD' : 
                   accuracy < 0.5 ? 'ACCEPTABLE' : 'POOR';
                   
    console.log(`   • Accuracy: ${accuracy.toFixed(3)}s off 1.0s target (${rating})`);
    
    if (result.stdout) {
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const lastLines = lines.slice(-2);
      console.log(`   • Output: ${lastLines.join(' | ')}`);
    }
    
    return {
      parameter,
      cpuTime,
      wallTime,
      accuracy,
      rating,
      success: result.status.id === 3,
      description
    };
    
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.response?.data || error.message);
    return { parameter, success: false, description };
  }
}

async function findAccurateCalibration() {
  console.log('🎯 Aggressive CPU Calibration for 1-Second Target');
  console.log('=================================================');
  console.log('Based on initial results: 400x400 matrix = 0.391s');
  console.log('Scaling up to reach ~1.0s CPU time\n');
  
  // Based on the 400x400 = 0.391s result, we need larger parameters
  const tests = [
    // Matrix multiplication - scale up significantly
    { type: 'matrix', param: 600, description: 'Matrix 600x600 (~1.4s estimate)' },
    { type: 'matrix', param: 650, description: 'Matrix 650x650 (~1.7s estimate)' },
    { type: 'matrix', param: 700, description: 'Matrix 700x700 (~2.0s estimate)' },
    
    // Intensive computation - different approach
    { type: 'computation', param: 10000000, description: 'Intensive computation (10M ops)' },
    { type: 'computation', param: 15000000, description: 'Intensive computation (15M ops)' },
    { type: 'computation', param: 20000000, description: 'Intensive computation (20M ops)' },
    { type: 'computation', param: 25000000, description: 'Intensive computation (25M ops)' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    let sourceCode;
    if (test.type === 'matrix') {
      sourceCode = generateOptimizedMatrixCode(test.param);
    } else {
      sourceCode = generateIntensiveComputationCode(test.param);
    }
    
    const result = await calibrateAlgorithm(sourceCode, test.description, test.param);
    results.push(result);
    
    // Stop if we find a good result
    if (result.success && result.accuracy < 0.2) {
      console.log(`\n🎉 Found excellent calibration! Stopping early.`);
      break;
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // Find the best result
  const successfulResults = results.filter(r => r.success);
  const sortedByAccuracy = successfulResults.sort((a, b) => a.accuracy - b.accuracy);
  
  console.log('\n📊 CALIBRATION RESULTS:');
  console.log('=======================');
  
  successfulResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.description}: ${result.cpuTime}s (${result.rating})`);
  });
  
  if (sortedByAccuracy.length > 0) {
    const optimal = sortedByAccuracy[0];
    console.log(`\n🏆 BEST CALIBRATION:`);
    console.log(`   • Algorithm: ${optimal.description}`);
    console.log(`   • Parameter: ${optimal.parameter}`);
    console.log(`   • CPU Time: ${optimal.cpuTime}s`);
    console.log(`   • Accuracy: ±${optimal.accuracy.toFixed(3)}s`);
    console.log(`   • Rating: ${optimal.rating}`);
    
    return optimal;
  } else {
    console.log('\n❌ No successful calibrations found');
    return null;
  }
}

async function main() {
  if (!RAPIDAPI_KEY) {
    console.log('❌ No API key found');
    return;
  }
  
  const optimal = await findAccurateCalibration();
  
  if (optimal && optimal.accuracy < 0.3) {
    console.log('\n✅ Good calibration found!');
    console.log('📋 Ready for production-accurate batch testing');
  } else {
    console.log('\n⚠️  May need further calibration refinement');
  }
}

if (require.main === module) {
  main().catch(console.error);
} 