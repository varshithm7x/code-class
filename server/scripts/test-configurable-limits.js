const axios = require('axios');

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

if (!RAPIDAPI_KEY) {
    console.error('Please set JUDGE0_API_KEY environment variable');
    process.exit(1);
}

const headers = {
    'content-type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST
};

// Test different CPU time limits to find maximum allowed
async function testMaxTimeLimit() {
    console.log('Testing maximum configurable CPU time limits...\n');
    
    const cppCode = `
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    cout << "Starting execution..." << endl;
    
    // Sleep for the specified time
    this_thread::sleep_for(chrono::seconds(15));
    
    cout << "Execution completed!" << endl;
    return 0;
}`;

    const testLimits = [5, 10, 15, 20, 25, 30, 50, 100];
    
    for (const cpuTimeLimit of testLimits) {
        try {
            console.log(`Testing CPU time limit: ${cpuTimeLimit} seconds`);
            
            const submissionData = {
                source_code: cppCode,
                language_id: 54, // C++ (GCC 9.2.0)
                cpu_time_limit: cpuTimeLimit,
                wall_time_limit: cpuTimeLimit + 10, // Higher wall time
                stdin: ""
            };

            // Create submission
            const createResponse = await axios.post(`${JUDGE0_URL}/submissions?wait=false`, 
                submissionData, 
                { headers }
            );

            if (createResponse.status === 201) {
                const token = createResponse.data.token;
                console.log(`✓ Submission created with token: ${token}`);
                
                // Wait for result
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Get result
                const resultResponse = await axios.get(
                    `${JUDGE0_URL}/submissions/${token}?fields=status,message,time,wall_time`,
                    { headers }
                );
                
                const result = resultResponse.data;
                console.log(`  Status: ${result.status.description}`);
                console.log(`  Time: ${result.time}s`);
                console.log(`  Wall Time: ${result.wall_time}s`);
                if (result.message) {
                    console.log(`  Message: ${result.message}`);
                }
                console.log('');
                
            } else {
                console.log(`✗ Failed to create submission with ${cpuTimeLimit}s limit`);
                console.log('');
            }
            
        } catch (error) {
            if (error.response && error.response.status === 422) {
                console.log(`✗ CPU time limit ${cpuTimeLimit}s not allowed`);
                console.log(`  Error: ${JSON.stringify(error.response.data)}`);
                console.log('');
                // Found the maximum, break
                break;
            } else {
                console.log(`✗ Error testing ${cpuTimeLimit}s: ${error.message}`);
                console.log('');
            }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Test wall time limits separately
async function testMaxWallTimeLimit() {
    console.log('\nTesting maximum configurable wall time limits...\n');
    
    const cppCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Quick execution" << endl;
    return 0;
}`;

    const testLimits = [10, 20, 50, 100, 150, 200, 300];
    
    for (const wallTimeLimit of testLimits) {
        try {
            console.log(`Testing wall time limit: ${wallTimeLimit} seconds`);
            
            const submissionData = {
                source_code: cppCode,
                language_id: 54, // C++ (GCC 9.2.0)
                cpu_time_limit: 2, // Keep CPU time low
                wall_time_limit: wallTimeLimit,
                stdin: ""
            };

            // Create submission
            const createResponse = await axios.post(`${JUDGE0_URL}/submissions?wait=false`, 
                submissionData, 
                { headers }
            );

            if (createResponse.status === 201) {
                const token = createResponse.data.token;
                console.log(`✓ Submission created with wall time limit: ${wallTimeLimit}s`);
            } else {
                console.log(`✗ Failed to create submission with ${wallTimeLimit}s wall time limit`);
            }
            
        } catch (error) {
            if (error.response && error.response.status === 422) {
                console.log(`✗ Wall time limit ${wallTimeLimit}s not allowed`);
                console.log(`  Error: ${JSON.stringify(error.response.data)}`);
                // Found the maximum, break
                break;
            } else {
                console.log(`✗ Error testing ${wallTimeLimit}s: ${error.message}`);
            }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

// Get configuration info from Judge0
async function getConfigInfo() {
    console.log('Getting Judge0 configuration info...\n');
    
    try {
        const response = await axios.get(`${JUDGE0_URL}/config_info`, { headers });
        const config = response.data;
        
        console.log('Judge0 Configuration:');
        console.log(`  Default CPU time limit: ${config.cpu_time_limit}s`);
        console.log(`  Maximum CPU time limit: ${config.max_cpu_time_limit}s`);
        console.log(`  Default wall time limit: ${config.wall_time_limit}s`);
        console.log(`  Maximum wall time limit: ${config.max_wall_time_limit}s`);
        console.log(`  Default CPU extra time: ${config.cpu_extra_time}s`);
        console.log(`  Maximum CPU extra time: ${config.max_cpu_extra_time}s`);
        console.log('');
        
        return config;
    } catch (error) {
        console.log(`Error getting config: ${error.message}`);
        return null;
    }
}

// Main execution
async function main() {
    console.log('Judge0 Time Limit Configuration Testing\n');
    console.log('=' * 50);
    
    // Get current configuration
    const config = await getConfigInfo();
    
    if (config) {
        // Test the maximum limits
        await testMaxTimeLimit();
        await testMaxWallTimeLimit();
        
        console.log('\n' + '=' * 50);
        console.log('Summary:');
        console.log(`Based on configuration, maximum limits should be:`);
        console.log(`  CPU time: ${config.max_cpu_time_limit}s`);
        console.log(`  Wall time: ${config.max_wall_time_limit}s`);
    } else {
        // Still test without config info
        await testMaxTimeLimit();
        await testMaxWallTimeLimit();
    }
}

main().catch(console.error); 