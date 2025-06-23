# Multi-Test System User Guide 🚀

## What is Multi-Test?

The Multi-Test system allows you to test your code against dozens or hundreds of test cases using **only 1 API call** instead of hundreds. This means:

- ⚡ **5-50x faster execution** for large test suites
- 💰 **90% reduction in API costs** for institutions  
- 🏆 **Competitive programming experience** with solve() functions
- ✅ **Same accuracy** as traditional testing

## How It Works

### Traditional Testing (slow)
```
Test Case 1 → API Call 1 → Result 1
Test Case 2 → API Call 2 → Result 2
...
Test Case 50 → API Call 50 → Result 50
```
**Result: 50 API calls, 5-10 seconds**

### Multi-Test System (fast)
```
All Test Cases → 1 API Call → All Results
```
**Result: 1 API call, 0.1 seconds**

## Using Multi-Test Features

### Step 1: Choose Your Code Mode

When taking a test, you'll see two options:

1. **Full Code Mode** (traditional)
   - Write complete programs
   - Handle input/output yourself
   - Good for learning basics

2. **Solve Function Mode** (recommended)
   - Write only the `solve()` function
   - System handles input/output
   - Faster execution with multi-test

### Step 2: Writing Solve Functions

Instead of writing a full program, just write the logic:

**Traditional Approach:**
```cpp
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    cin >> n >> target;
    
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    
    // Find solution
    cout << result << endl;
    return 0;
}
```

**Multi-Test Approach (Solve Function):**
```cpp
void solve() {
    int n, target;
    cin >> n >> target;
    
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }
    
    // Find solution
    cout << result << endl;
}
```

### Step 3: Enable Multi-Test Optimization

1. Switch to **Solve Function Mode**
2. Toggle **Multi-Test Optimization** ON
3. Watch for efficiency indicators like "**25x faster**"

## Features You'll See

### Efficiency Badges
- 🟢 **5x faster** - Small test suites
- 🔵 **25x faster** - Medium test suites  
- 🟣 **50x faster** - Large test suites

### Smart Editor
- Auto-loads solve function template
- Syntax highlighting for C++
- Real-time code validation

### Enhanced Results
- Individual test case breakdown
- Performance summaries
- API efficiency metrics
- Clear pass/fail indicators

## Performance Benefits

| Test Cases | Traditional | Multi-Test | Speedup |
|------------|-------------|------------|---------|
| 5 tests    | 2-3 seconds | 0.5 seconds | **5x** |
| 25 tests   | 10-15 seconds | 0.5 seconds | **25x** |
| 50 tests   | 20-30 seconds | 0.8 seconds | **50x** |

## Best Practices

### Function Structure
```cpp
void solve() {
    // Read input
    int n;
    cin >> n;
    
    // Process
    // Your algorithm here
    
    // Output result
    cout << result << endl;
}
```

### Input/Output Guidelines
- ✅ Use `cin` and `cout` normally
- ✅ Handle one test case per solve() call
- ✅ End output lines with `endl` or `\n`
- ❌ Don't loop for multiple test cases in solve()
- ❌ Don't include `main()` function

## Success Tips

1. **Start Simple** - Try solve functions with public test cases
2. **Practice Pattern** - Get comfortable with the solve() structure  
3. **Use Multi-Test** - Enable optimization for better performance
4. **Check Results** - Review efficiency gains and accuracy
5. **Ask Questions** - Your instructor can help with advanced features

**Happy coding with 50x faster test execution! 🚀**

---

## 📞 **Support**

- **Feature Issues**: Report to your instructor
- **Technical Problems**: Check system status at `/api/v1/monitoring/health`
- **Performance Questions**: View efficiency metrics in results

**Happy coding with 50x faster test execution! 🚀** 