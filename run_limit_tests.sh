#!/bin/bash

# Judge0 Time Limit Test Runner
echo "🚀 Starting Judge0 Time Limit Tests..."
echo "====================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found in project root"
    echo "Please create .env file with JUDGE0_API_KEY and JUDGE0_API_KEY_2"
    exit 1
fi

# Check if API keys are set
if ! grep -q "JUDGE0_API_KEY=" .env; then
    echo "❌ JUDGE0_API_KEY not found in .env file"
    exit 1
fi

echo "✅ Environment configuration found"

# Navigate to test directory and run tests
cd tools/judge0-tests

echo "📦 Installing dependencies..."
npm install --silent

echo "🧪 Running time limit tests..."
npx ts-node test_limits.ts

echo ""
echo "📁 Results saved in: tools/judge0-tests/results/"
echo "📁 Raw responses in: tools/judge0-tests/results/raw/"
