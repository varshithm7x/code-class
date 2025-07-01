const axios = require('axios');

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
};

// Generate different CPU-intensive algorithms for calibration
function generatePrimeCalculationCode(iterations) {
  return `
#include <iostream>
#include <chrono>
using namespace std;

bool isPrime(long long n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 == 0 || n % 3 == 0) return false;
    
    for (long long i = 5; i * i <= n; i += 6) {
        if (n % i == 0 || n % (i + 2) == 0) return false;
    }
    return true;
}

int main() {
    auto start = chrono::high_resolution_clock::now();
    
    long long count = 0;
    long long num = 1000000; // Start from 1 million
    
    cout << "Starting prime calculation with ${iterations} iterations" << endl;
    
    for(int i = 0; i < ${iterations}; i++) {
        while(!isPrime(num)) {
            num++;
        }
        count++;
        num++;
        
        if(i % 1000 == 0) {
            cout << "Iteration " << i << " completed, found prime: " << (num-1) << endl;
        }
    }
    
    auto end = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    
    cout << "Found " << count << " primes in " << duration.count() << "ms" << endl;
    cout << "Calibration complete" << endl;
    
    return 0;
}`;
}

function generateMatrixMultiplicationCode(size) {
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
            A[i][j] = i + j + 1;
            B[i][j] = i * j + 1;
        }
    }
    
    // Matrix multiplication
    for(int i = 0; i < n; i++) {
        for(int j = 0; j < n; j++) {
            for(int k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    
    auto end = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    
    cout << "Matrix multiplication completed in " << duration.count() << "ms" << endl;
    cout << "Result sample: C[0][0] = " << C[0][0] << endl;
    cout << "Calibration complete" << endl;
    
    return 0;
}`;
}

function generateHashingCode(iterations) {
  return `
#include <iostream>
#include <string>
#include <chrono>
using namespace std;

// Simple hash function
unsigned long hash(const string& str) {
    unsigned long hash = 5381;
    for (char c : str) {
        hash = ((hash << 5) + hash) + c;
    }
    return hash;
}

int main() {
    auto start = chrono::high_resolution_clock::now();
    
    cout << "Starting hash computation with ${iterations} iterations" << endl;
    
    unsigned long totalHash = 0;
    string baseStr = "Judge0CalibrationTest";
    
    for(int i = 0; i < ${iterations}; i++) {
        string testStr = baseStr + to_string(i);
        
        // Compute hash multiple times for more CPU work
        for(int j = 0; j < 1000; j++) {
            totalHash += hash(testStr + to_string(j));
        }
        
        if(i % 10000 == 0) {
            cout << "Iteration " << i << " completed" << endl;
        }
    }
    
    auto end = chrono::high_resolution_clock::now();
    auto duration = chrono::duration_cast<chrono::milliseconds>(end - start);
    
    cout << "Hash computation completed in " << duration.count() << "ms" << endl;
    cout << "Total hash: " << totalHash << endl;
    cout << "Calibration complete" << endl;
    
    return 0;
}`;
}

async function calibrateAlgorithm(algorithm, parameter, description) {
  console.log(`\n🧪 Calibrating: ${description}`);
  
  let sourceCode;
  switch(algorithm) {
    case 'prime':
      sourceCode = generatePrimeCalculationCode(parameter);
      break;
    case 'matrix':
      sourceCode = generateMatrixMultiplicationCode(parameter);
      break;
    case 'hash':
      sourceCode = generateHashingCode(parameter);
      break;
    default:
      throw new Error('Unknown algorithm');
  }
  
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
    
    console.log(`📊 ${description} Results:`);
    console.log(`   • Status: ${result.status.description}`);
    console.log(`   • CPU Time: ${cpuTime}s`);
    console.log(`   • Wall Time: ${wallTime.toFixed(1)}s`);
    console.log(`   • Memory: ${result.memory} KB`);
    console.log(`   • Parameter: ${parameter}`);
    
    if (result.stdout) {
      const lines = result.stdout.split('\n').slice(-3);
      console.log(`   • Output: ${lines.join(' | ')}`);
    }
    
    // Rate how close to 1 second this is
    const accuracy = Math.abs(cpuTime - 1.0);
    const rating = accuracy < 0.1 ? 'EXCELLENT' : 
                   accuracy < 0.3 ? 'GOOD' : 
                   accuracy < 0.5 ? 'ACCEPTABLE' : 'POOR';
                   
    console.log(`   • Accuracy: ${accuracy.toFixed(3)}s off target (${rating})`);
    
    return {
      algorithm,
      parameter,
      cpuTime,
      wallTime,
      accuracy,
      rating,
      success: result.status.id === 3
    };
    
  } catch (error) {
    console.log(`❌ ${description} failed:`, error.response?.data || error.message);
    return { algorithm, parameter, success: false };
  }
}

async function findOptimalParameters() {
  console.log('🎯 CPU Algorithm Calibration for 1-Second Target');
  console.log('=================================================');
  console.log('Goal: Find algorithm parameters that take exactly 1 second CPU time\n');
  
  const calibrationTests = [
    // Prime number calculations
    { algorithm: 'prime', parameter: 5000, description: 'Prime calculation (5K iterations)' },
    { algorithm: 'prime', parameter: 10000, description: 'Prime calculation (10K iterations)' },
    { algorithm: 'prime', parameter: 15000, description: 'Prime calculation (15K iterations)' },
    
    // Matrix multiplication
    { algorithm: 'matrix', parameter: 200, description: 'Matrix multiplication (200x200)' },
    { algorithm: 'matrix', parameter: 300, description: 'Matrix multiplication (300x300)' },
    { algorithm: 'matrix', parameter: 400, description: 'Matrix multiplication (400x400)' },
    
    // Hash computation
    { algorithm: 'hash', parameter: 50000, description: 'Hash computation (50K iterations)' },
    { algorithm: 'hash', parameter: 100000, description: 'Hash computation (100K iterations)' },
    { algorithm: 'hash', parameter: 200000, description: 'Hash computation (200K iterations)' },
  ];
  
  const results = [];
  
  for (const test of calibrationTests) {
    const result = await calibrateAlgorithm(test.algorithm, test.parameter, test.description);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Analyze results and find the best one
  const successfulResults = results.filter(r => r.success);
  const sortedByAccuracy = successfulResults.sort((a, b) => a.accuracy - b.accuracy);
  
  console.log('\n📊 CALIBRATION RESULTS SUMMARY:');
  console.log('==============================');
  
  successfulResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.algorithm} (${result.parameter}): ${result.cpuTime}s - ${result.rating}`);
  });
  
  if (sortedByAccuracy.length > 0) {
    const optimal = sortedByAccuracy[0];
    console.log(`\n🏆 OPTIMAL ALGORITHM FOUND:`);
    console.log(`   • Type: ${optimal.algorithm}`);
    console.log(`   • Parameter: ${optimal.parameter}`);
    console.log(`   • CPU Time: ${optimal.cpuTime}s`);
    console.log(`   • Accuracy: ${optimal.accuracy.toFixed(3)}s off target`);
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
  
  const optimal = await findOptimalParameters();
  
  if (optimal) {
    console.log('\n✅ Calibration complete!');
    console.log('📋 Next step: Use this algorithm for accurate batch testing');
  }
}

if (require.main === module) {
  main().catch(console.error);
} 