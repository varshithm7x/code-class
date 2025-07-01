#!/bin/bash

# Judge0 Health Check Script
# Validates Judge0 installation and functionality

echo "🔍 Starting Judge0 health check..."

# Configuration
JUDGE0_URL="http://localhost:2358"
MAX_RETRIES=5
RETRY_DELAY=10

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test functions
test_api_connectivity() {
    echo "🌐 Testing Judge0 API connectivity..."
    
    local response
    for i in $(seq 1 $MAX_RETRIES); do
        response=$(curl -s -o /dev/null -w "%{http_code}" "${JUDGE0_URL}/languages" 2>/dev/null)
        
        if [ "$response" = "200" ]; then
            log_info "API connectivity test passed"
            return 0
        fi
        
        log_warn "API connectivity test failed (attempt $i/$MAX_RETRIES) - HTTP $response"
        sleep $RETRY_DELAY
    done
    
    log_error "API connectivity test failed after $MAX_RETRIES attempts"
    return 1
}

test_language_support() {
    echo "📝 Testing language support..."
    
    local languages
    languages=$(curl -s "${JUDGE0_URL}/languages" 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to fetch languages"
        return 1
    fi
    
    # Check for essential languages
    local cpp_found=$(echo "$languages" | jq '.[] | select(.id == 54)' 2>/dev/null)
    local python_found=$(echo "$languages" | jq '.[] | select(.id == 71)' 2>/dev/null)
    local java_found=$(echo "$languages" | jq '.[] | select(.id == 62)' 2>/dev/null)
    
    if [ -n "$cpp_found" ]; then
        log_info "C++ (54) language support confirmed"
    else
        log_error "C++ (54) language not found"
        return 1
    fi
    
    if [ -n "$python_found" ]; then
        log_info "Python (71) language support confirmed"
    else
        log_error "Python (71) language not found"
        return 1
    fi
    
    if [ -n "$java_found" ]; then
        log_info "Java (62) language support confirmed"
    else
        log_warn "Java (62) language not found"
    fi
    
    local total_languages=$(echo "$languages" | jq 'length' 2>/dev/null)
    log_info "Total languages available: $total_languages"
    
    return 0
}

test_cpp_execution() {
    echo "🚀 Testing C++ compilation and execution..."
    
    local test_result
    test_result=$(curl -s -X POST "${JUDGE0_URL}/submissions?wait=true" \
      -H "Content-Type: application/json" \
      -d '{
        "source_code": "#include <iostream>\n#include <string>\nint main() {\n    std::string msg = \"Hello Judge0\";\n    std::cout << msg << std::endl;\n    return 0;\n}",
        "language_id": 54,
        "stdin": ""
      }' 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to submit C++ test"
        return 1
    fi
    
    local status=$(echo "$test_result" | jq -r '.status.description' 2>/dev/null)
    local output=$(echo "$test_result" | jq -r '.stdout' 2>/dev/null)
    
    if [ "$status" = "Accepted" ] && [[ "$output" == *"Hello Judge0"* ]]; then
        log_info "C++ execution test passed"
        return 0
    else
        log_error "C++ execution test failed - Status: $status, Output: $output"
        echo "Full response: $test_result"
        return 1
    fi
}

test_python_execution() {
    echo "🐍 Testing Python execution..."
    
    local test_result
    test_result=$(curl -s -X POST "${JUDGE0_URL}/submissions?wait=true" \
      -H "Content-Type: application/json" \
      -d '{
        "source_code": "import sys\nprint(\"Hello from Python\", sys.version_info.major)",
        "language_id": 71,
        "stdin": ""
      }' 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to submit Python test"
        return 1
    fi
    
    local status=$(echo "$test_result" | jq -r '.status.description' 2>/dev/null)
    local output=$(echo "$test_result" | jq -r '.stdout' 2>/dev/null)
    
    if [ "$status" = "Accepted" ] && [[ "$output" == *"Hello from Python"* ]]; then
        log_info "Python execution test passed"
        return 0
    else
        log_error "Python execution test failed - Status: $status, Output: $output"
        echo "Full response: $test_result"
        return 1
    fi
}

test_batch_submission() {
    echo "📦 Testing batch submission capability..."
    
    local batch_result
    batch_result=$(curl -s -X POST "${JUDGE0_URL}/submissions/batch" \
      -H "Content-Type: application/json" \
      -d '{
        "submissions": [
          {
            "source_code": "print(1)",
            "language_id": 71,
            "stdin": ""
          },
          {
            "source_code": "print(2)",
            "language_id": 71,
            "stdin": ""
          },
          {
            "source_code": "print(3)",
            "language_id": 71,
            "stdin": ""
          }
        ]
      }' 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to submit batch test"
        return 1
    fi
    
    local batch_count=$(echo "$batch_result" | jq 'length' 2>/dev/null)
    
    if [ "$batch_count" = "3" ]; then
        log_info "Batch submission test passed (3 submissions created)"
        
        # Wait a bit and check if they completed
        sleep 5
        
        local tokens=$(echo "$batch_result" | jq -r '.[].token' 2>/dev/null)
        local completed_count=0
        
        for token in $tokens; do
            local status_result=$(curl -s "${JUDGE0_URL}/submissions/${token}" 2>/dev/null)
            local status=$(echo "$status_result" | jq -r '.status.description' 2>/dev/null)
            
            if [ "$status" = "Accepted" ]; then
                ((completed_count++))
            fi
        done
        
        if [ $completed_count -eq 3 ]; then
            log_info "All batch submissions completed successfully"
        else
            log_warn "Only $completed_count/3 batch submissions completed"
        fi
        
        return 0
    else
        log_error "Batch submission test failed - Expected 3 submissions, got $batch_count"
        echo "Batch result: $batch_result"
        return 1
    fi
}

test_performance() {
    echo "⚡ Testing performance characteristics..."
    
    # Test concurrent submissions
    local start_time=$(date +%s)
    
    # Submit 5 simple programs concurrently
    for i in {1..5}; do
        (curl -s -X POST "${JUDGE0_URL}/submissions" \
          -H "Content-Type: application/json" \
          -d "{
            \"source_code\": \"print($i)\",
            \"language_id\": 71,
            \"stdin\": \"\"
          }" > /dev/null 2>&1) &
    done
    
    wait
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "5 concurrent submissions completed in ${duration}s"
    
    if [ $duration -le 10 ]; then
        log_info "Performance test passed (≤10s for 5 submissions)"
        return 0
    else
        log_warn "Performance test marginal (${duration}s > 10s for 5 submissions)"
        return 0
    fi
}

test_docker_health() {
    echo "🐳 Testing Docker container health..."
    
    # Check if all required containers are running
    local required_containers=("judge0-server" "judge0-workers" "judge0-db" "judge0-redis")
    local all_healthy=true
    
    for container in "${required_containers[@]}"; do
        local container_status=$(docker ps --filter "name=$container" --format "{{.Status}}" 2>/dev/null)
        
        if [[ $container_status == *"Up"* ]]; then
            log_info "Container $container is running"
        else
            log_warn "Container $container is not running properly"
            all_healthy=false
        fi
    done
    
    # Check container resource usage
    local high_memory_containers=$(docker stats --no-stream --format "table {{.Name}}\t{{.MemPerc}}" | awk 'NR>1 && $2+0 > 90 {print $1}')
    
    if [ -n "$high_memory_containers" ]; then
        log_warn "High memory usage detected in containers: $high_memory_containers"
    else
        log_info "Memory usage is within acceptable limits"
    fi
    
    if $all_healthy; then
        return 0
    else
        return 1
    fi
}

# Main health check execution
main() {
    echo "🔍 Starting comprehensive Judge0 health check..."
    echo "Time: $(date)"
    echo "Host: $(hostname)"
    echo "----------------------------------------"
    
    local failed_tests=0
    
    # Run all tests
    test_api_connectivity || ((failed_tests++))
    echo ""
    
    test_language_support || ((failed_tests++))
    echo ""
    
    test_cpp_execution || ((failed_tests++))
    echo ""
    
    test_python_execution || ((failed_tests++))
    echo ""
    
    test_batch_submission || ((failed_tests++))
    echo ""
    
    test_performance || ((failed_tests++))
    echo ""
    
    test_docker_health || ((failed_tests++))
    echo ""
    
    # Summary
    echo "----------------------------------------"
    if [ $failed_tests -eq 0 ]; then
        log_info "🎉 All health checks passed! Judge0 is ready for production use."
        echo "✅ System Status: HEALTHY"
        exit 0
    else
        log_error "❌ $failed_tests test(s) failed. Judge0 may not be ready for production."
        echo "⚠️ System Status: UNHEALTHY"
        exit 1
    fi
}

# Run the health check
main "$@" 