# Judge0 Batch Testing: Finding Optimal Test Case Bundling

## Overview

This document explains our testing approach to determine the maximum number of test cases that can be efficiently bundled in a single Judge0 submission using the **pooled API approach** for 100 students.

## Test Strategy

### Objective
Find the optimal number of test cases that can be processed in a single Judge0 submission by:
1. **Bundling test cases** into the source code using a loop structure
2. **Maximizing CPU/Wall time limits** (15s CPU, 20s wall time)
3. **Testing with 1-second per test case** to ensure production reliability

### Test Code Structure
```cpp
#include <iostream>
#include <chrono>
#include <thread>
using namespace std;

int main() {
    int t;
    cin >> t;  // Number of test cases
    
    for(int i = 1; i <= t; i++) {
        // Simulate 1 second processing per test case
        this_thread::sleep_for(chrono::seconds(1));
        cout << "Test case " << i << " completed" << endl;
    }
    
    return 0;
}
```

## Test Configuration

### Judge0 Limits (From Official API Documentation)
- **`max_cpu_time_limit`**: 15 seconds
- **`max_wall_time_limit`**: 20 seconds  
- **`max_memory_limit`**: 256,000 KB (256 MB)
- **Batch size limit**: 20 submissions per batch

### Our Test Parameters
```javascript
{
  source_code: "...",
  language_id: 54,  // C++ (GCC 9.2.0)
  stdin: numberOfTestCases.toString(),
  cpu_time_limit: 15,    // Maximum allowed
  wall_time_limit: 20,   // Maximum allowed
  memory_limit: 256000   // Maximum allowed
}
```

## Test Cases

### 1. Individual Test Case Limits
- **Test**: 5, 10, 15, 20, 25, 30 test cases per submission
- **Expected**: Up to 15 test cases should work reliably (15 seconds ÷ 1 second each)
- **Goal**: Find the safe upper bound for production use

### 2. Input Size Limits
- **Test**: Large input data (100KB)
- **Purpose**: Ensure input size isn't a bottleneck for complex test cases

### 3. Batch Submission Test
- **Test**: 20 identical programs × 3 test cases each = 60 total test cases
- **Purpose**: Validate the full batch approach works in practice

### 4. Cost Analysis
- **Calculate**: API calls needed for 100 students × 4 problems × 100 test cases
- **Compare**: Against available free tier calls (100 students × 50 calls = 5,000 free calls)

## Expected Results

### Conservative Estimate
- **Safe limit**: 10-12 test cases per submission
- **Batch capacity**: 20 × 12 = 240 test cases per batch
- **API calls needed**: ⌈40,000 ÷ 240⌉ = 167 calls
- **Free tier usage**: 167 ÷ 5,000 = 3.3%

### Optimistic Estimate  
- **Maximum limit**: 15 test cases per submission
- **Batch capacity**: 20 × 15 = 300 test cases per batch
- **API calls needed**: ⌈40,000 ÷ 300⌉ = 134 calls
- **Free tier usage**: 134 ÷ 5,000 = 2.7%

## How to Run Tests

### Prerequisites
1. Get a free RapidAPI key:
   - Go to https://rapidapi.com/judge0-official/api/judge0-ce
   - Subscribe to Basic (FREE) plan
   - Copy your API key

### Running the Tests
```bash
# Set your API key
export RAPIDAPI_KEY="your_rapidapi_key_here"

# Run the test suite
cd server
npm run test:judge0-limits

# Or run directly with key
RAPIDAPI_KEY="your_key" npm run test:judge0-limits
```

### Test Duration
- **Estimated time**: 3-5 minutes
- **Test cases**: 6 individual + 3 validation tests
- **Real API calls**: Uses your free tier quota minimally

## Implications for Pooled API Approach

### If Tests Confirm 15 Test Cases Per Submission:

#### Efficiency
- **300 test cases per batch** (20 × 15)
- **Only 134 API calls needed** for entire exam
- **97.3% free tier remaining** for future tests

#### Cost Analysis
```
Total test cases: 100 students × 4 problems × 100 tests = 40,000
Batch capacity: 20 submissions × 15 test cases = 300 per batch
Batches needed: ⌈40,000 ÷ 300⌉ = 134 batches = 134 API calls

Free tier available: 100 students × 50 calls = 5,000 calls
Utilization: 134 ÷ 5,000 = 2.7%
Remaining capacity: 4,866 calls for future exams
```

#### Backup Strategy
- **If free tier exhausted**: Sulu API costs $0.0005 per call
- **Worst case cost**: 134 × $0.0005 = **$0.067 per exam**
- **Annual cost** (50 exams): $3.35

### Comparison vs EC2 Approach
- **EC2 cost per exam**: $0.31-0.53
- **Pooled API cost per exam**: $0.00-0.067
- **Cost savings**: 85-100% reduction
- **Infrastructure complexity**: Eliminated
- **Maintenance overhead**: Zero

## Success Criteria

✅ **Test passes if**:
- Can reliably process 10+ test cases per submission
- Batch submissions work with 20 programs
- Input size limits support complex test cases
- Total API calls needed < 300 (well within free tier)

✅ **Pooled approach confirmed viable if**:
- Cost per exam < $0.10
- Free tier covers 90%+ of usage
- No infrastructure management required
- Scales to 100+ students seamlessly

## Next Steps After Testing

1. **Implement bundling logic** in the test submission service
2. **Create API key pool management** system
3. **Add Sulu API backup** integration
4. **Test with real coding problems** instead of sleep timers
5. **Validate with multiple programming languages**

---

*This testing approach provides empirical data to make an informed decision between the automated EC2 and pooled API approaches for hosting coding tests.* 