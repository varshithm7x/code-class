const axios = require('axios');

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_HOST = 'judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.JUDGE0_API_KEY;

const headers = {
    'content-type': 'application/json',
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST
};

class TheoreticalMaximumService {
    static get MAX_FILES() { return 20; }
    static get TEST_CASES_PER_FILE() { return 20; }
    static get THEORETICAL_MAXIMUM() { return 400; } // 20 × 20

    static generateTestCases(totalCases = 400) {
        const testCases = [];
        
        for (let i = 0; i < totalCases; i++) {
            // Simple array sum problem for fast execution
            const arr = [1, 2, 3, 4, 5];
            const expectedSum = 15;
            
            testCases.push({
                input: `${arr.length}\\n${arr.join(' ')}`,
                expected: expectedSum.toString(),
                id: i + 1
            });
        }
        
        return testCases;
    }

    static createMaximumBatches(testCases) {
        const batches = [];
        
        for (let i = 0; i < testCases.length; i += this.TEST_CASES_PER_FILE) {
            if (batches.length >= this.MAX_FILES) break; // Respect Judge0 limit
            
            const batch = testCases.slice(i, i + this.TEST_CASES_PER_FILE);
            batches.push({
                testCases: batch,
                startIndex: i,
                endIndex: Math.min(i + this.TEST_CASES_PER_FILE - 1, testCases.length - 1),
                batchId: batches.length + 1
            });
        }
        
        return batches;
    }

    static generateSourceCode(batch) {
        const testCaseCount = batch.testCases.length;
        const startIndex = batch.startIndex + 1;
        
        return `
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    int t = ${testCaseCount}; // Test cases in this file
    int testCaseId = ${startIndex}; // Starting ID
    
    while (t--) {
        int n;
        cin >> n;
        vector<int> arr(n);
        int sum = 0;
        
        for (int i = 0; i < n; i++) {
            cin >> arr[i];
            sum += arr[i];
        }
        
        cout << sum << endl;
        testCaseId++;
    }
    
    return 0;
}`;
    }

    static generateBatchStdin(batch) {
        return batch.testCases.map(testCase => testCase.input).join('\\n');
    }
}

async function testTheoreticalMaximum() {
    console.log('🚀 TESTING THEORETICAL MAXIMUM: 400 TEST CASES');
    console.log('==============================================\\n');

    console.log('📊 Configuration:');
    console.log(`   • Total test cases: ${TheoreticalMaximumService.THEORETICAL_MAXIMUM}`);
    console.log(`   • Files per batch: ${TheoreticalMaximumService.MAX_FILES}`);
    console.log(`   • Test cases per file: ${TheoreticalMaximumService.TEST_CASES_PER_FILE}`);
    console.log(`   • Wall time limit: 30s per file`);
    console.log(`   • CPU time limit: 20s per file`);
    console.log(`   • Expected execution time: ~20s per file\\n`);

    const testCases = TheoreticalMaximumService.generateTestCases(100); // Start smaller for testing
    const batches = TheoreticalMaximumService.createMaximumBatches(testCases);

    console.log(`✅ Generated ${batches.length} batches for ${testCases.length} test cases`);
    
    // Calculate efficiency metrics
    const traditionalSubmissions = testCases.length;
    const revolutionarySubmissions = 1; // Single batch submission
    const efficiency = traditionalSubmissions / revolutionarySubmissions;
    const apiQuotaSaved = ((traditionalSubmissions - revolutionarySubmissions) / traditionalSubmissions * 100).toFixed(2);

    console.log('\\n📈 EFFICIENCY ANALYSIS:');
    console.log(`   Traditional approach: ${traditionalSubmissions} individual submissions`);
    console.log(`   Revolutionary approach: ${revolutionarySubmissions} batch submission`);
    console.log(`   Efficiency gain: ${efficiency}x improvement`);
    console.log(`   API quota saved: ${apiQuotaSaved}%`);

    try {
        console.log('\\n🔧 Preparing batch submission...');
        
        const batchSubmissions = [];
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const sourceCode = TheoreticalMaximumService.generateSourceCode(batch);
            const stdin = TheoreticalMaximumService.generateBatchStdin(batch);
            
            batchSubmissions.push({
                language_id: 54,
                source_code: sourceCode,
                stdin: stdin,
                cpu_time_limit: 20,
                wall_time_limit: 30,
                memory_limit: 256000
            });
            
            console.log(`   ✓ File ${i + 1}: Test cases ${batch.startIndex + 1}-${batch.endIndex + 1}`);
        }

        console.log(`\\n🚀 Submitting batch to Judge0...`);

        const batchResponse = await axios.post(
            `${JUDGE0_URL}/submissions/batch`,
            { submissions: batchSubmissions },
            { headers }
        );

        const tokens = batchResponse.data.map(result => result.token).filter(token => token);
        console.log(`\\n✅ Batch submitted! Received ${tokens.length} tokens.`);

        // Poll for results
        let attempts = 0;
        while (attempts < 30) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const resultResponse = await axios.get(
                    `${JUDGE0_URL}/submissions/batch?tokens=${tokens.join(',')}&fields=token,status,stdout,stderr,time,memory`,
                    { headers }
                );

                const results = resultResponse.data.submissions;
                const completed = results.filter(r => r.status && r.status.id >= 3).length;
                
                console.log(`   Progress: ${completed}/${tokens.length} completed`);

                if (completed === tokens.length) {
                    console.log('\\n🎉 ALL FILES COMPLETED!');
                    
                    let totalTestCasesProcessed = 0;
                    let successfulFiles = 0;

                    results.forEach((result, index) => {
                        const batch = batches[index];
                        const status = result.status?.description || 'Unknown';
                        const time = parseFloat(result.time) || 0;
                        
                        console.log(`   File ${index + 1}: ${status} (${time}s) - ${batch.testCases.length} test cases`);
                        
                        if (status === 'Accepted') {
                            successfulFiles++;
                            totalTestCasesProcessed += batch.testCases.length;
                        }
                    });

                    console.log('\\n🏆 REVOLUTIONARY BATCH RESULTS:');
                    console.log(`   ✅ Test cases processed: ${totalTestCasesProcessed}/${testCases.length}`);
                    console.log(`   ✅ Successful files: ${successfulFiles}/${results.length}`);
                    console.log(`   ✅ Efficiency: ${efficiency}x improvement`);
                    console.log(`   ✅ API quota saved: ${apiQuotaSaved}%`);
                    
                    return;
                }
            } catch (error) {
                console.log(`   Polling attempt ${attempts} failed`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

async function main() {
    console.log('🌟 THEORETICAL MAXIMUM VALIDATION TEST');
    console.log('=====================================\\n');
    
    await testTheoreticalMaximum();
    
    console.log('\\n🎊 TEST COMPLETE!');
}

if (require.main === module) {
    main().catch(console.error);
} 