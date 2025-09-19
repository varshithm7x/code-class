#!/bin/bash

# Judge0 Smoke Test Runner
# This script runs the Judge0 smoke tests from the project root

echo "🚀 Starting Judge0 RapidAPI Smoke Tests..."
echo "=========================================="

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

echo "🧪 Running smoke tests..."
npm run test:env

echo ""
echo "�� Results saved in: tools/judge0-tests/results/"
echo "📁 Raw responses in: tools/judge0-tests/results/raw/"
