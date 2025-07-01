const axios = require('axios');

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY_2 || process.env.JUDGE0_API_KEY;
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';

async function debugSubmission() {
    console.log('🔍 Debug: Testing simple submission');
    console.log('API Key being used:', JUDGE0_API_KEY ? `${JUDGE0_API_KEY.substring(0, 10)}...` : 'NOT SET');
    
    const simpleCode = `
#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`;

    try {
        console.log('📤 Submitting simple Hello World...');
        
        const response = await axios.post(
            `${JUDGE0_API_URL}/submissions?base64_encoded=true`,
            {
                source_code: Buffer.from(simpleCode).toString('base64'),
                language_id: 54, // C++17
                cpu_time_limit: 2,
                memory_limit: 128000
            },
            {
                headers: {
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Submission successful!');
        console.log('Token:', response.data.token);
        
        // Wait and get result
        console.log('⏳ Waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const resultResponse = await axios.get(
            `${JUDGE0_API_URL}/submissions/${response.data.token}?base64_encoded=true`,
            {
                headers: {
                    'X-RapidAPI-Key': JUDGE0_API_KEY,
                    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                }
            }
        );

        const result = resultResponse.data;
        console.log('📊 Result:');
        console.log('   Status:', result.status?.description);
        console.log('   CPU Time:', result.time);
        console.log('   Memory:', result.memory);
        console.log('   Output:', result.stdout ? Buffer.from(result.stdout, 'base64').toString() : 'None');
        
        if (result.stderr) {
            console.log('   Error:', Buffer.from(result.stderr, 'base64').toString());
        }

    } catch (error) {
        console.error('❌ Submission failed:');
        console.error('   Status:', error.response?.status);
        console.error('   Status Text:', error.response?.statusText);
        console.error('   Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('   Headers:', error.response?.headers);
    }
}

debugSubmission().catch(console.error); 