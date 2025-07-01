#!/bin/bash

# Auto-Shutdown Handler Script
# Monitors for shutdown signals and performs clean termination

echo "🔄 Starting auto-shutdown monitor..."

TEST_ID=${1:-"default"}
AWS_REGION=${AWS_DEFAULT_REGION:-"us-east-1"}
CHECK_INTERVAL=60  # Check every minute

cleanup_and_shutdown() {
    echo "🧹 Performing cleanup before shutdown..."
    
    # Stop accepting new submissions
    echo "⏸️ Stopping Judge0 services gracefully..."
    cd /opt/judge0-v1.13.0
    docker-compose stop server workers
    
    # Wait for pending submissions to complete (max 5 minutes)
    echo "⏳ Waiting for pending submissions to complete..."
    timeout=300
    while [ $timeout -gt 0 ]; do
        pending=$(docker-compose exec -T redis redis-cli LLEN judge0:queue 2>/dev/null || echo "0")
        if [ "$pending" = "0" ]; then
            echo "✅ All submissions completed"
            break
        fi
        echo "⏳ $pending submissions still pending... ($timeout seconds remaining)"
        sleep 10
        timeout=$((timeout - 10))
    done
    
    # Backup logs
    echo "💾 Backing up logs..."
    mkdir -p /opt/backup
    docker-compose logs > /opt/backup/judge0-logs-$(date +%Y%m%d-%H%M%S).log
    
    # Stop all services
    echo "🛑 Stopping all services..."
    docker-compose down
    
    # Update final status
    if command -v aws &> /dev/null; then
        aws ssm put-parameter --name "/judge0/${TEST_ID}/status" --value "TERMINATED" --overwrite --region "$AWS_REGION" || echo "⚠️ Could not update final status"
    fi
    
    echo "✅ Cleanup completed. Shutting down..."
    shutdown -h now
}

# Main monitoring loop
while true; do
    # Check for shutdown signal from SSM Parameter Store
    if command -v aws &> /dev/null; then
        SHUTDOWN_SIGNAL=$(aws ssm get-parameter --name "/judge0/${TEST_ID}/shutdown" --region "$AWS_REGION" --query 'Parameter.Value' --output text 2>/dev/null || echo "false")
        
        if [ "$SHUTDOWN_SIGNAL" = "true" ]; then
            echo "🔔 Shutdown signal received from control plane"
            cleanup_and_shutdown
            break
        fi
    fi
    
    # Check system load and auto-shutdown if idle for too long
    LOAD=$(uptime | awk -F'load average:' '{ print $2 }' | awk '{ print $1 }' | sed 's/,//')
    LOAD_INT=$(echo "$LOAD * 100" | bc -l 2>/dev/null | cut -d. -f1)
    
    # If load is very low for extended period, consider auto-shutdown
    if [ "${LOAD_INT:-100}" -lt 5 ]; then
        echo "📊 System load is low ($LOAD). Checking for idle timeout..."
        # This could be enhanced with more sophisticated idle detection
    fi
    
    sleep $CHECK_INTERVAL
done 