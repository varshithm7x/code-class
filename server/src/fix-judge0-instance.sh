#!/bin/bash
set -e

echo "🔧 Automated Judge0 Instance Fix"
echo "================================"

# Get instance IP
INSTANCE_IP=$(aws ec2 describe-instances --region ap-south-1 --filters "Name=instance-state-name,Values=running" "Name=tag:Name,Values=Judge0-*" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

if [ "$INSTANCE_IP" = "None" ] || [ -z "$INSTANCE_IP" ]; then
    echo "❌ No running Judge0 instance found"
    exit 1
fi

echo "🎯 Target instance IP: $INSTANCE_IP"

# Create remote fix script
cat > /tmp/remote-fix.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 Current status check..."
cd /opt/judge0-v1.13.0

echo "📋 Current containers:"
sudo docker ps -a

echo "🔧 Starting all Judge0 services..."
sudo docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "📋 Updated containers:"
sudo docker ps -a

echo "🧪 Testing Judge0 API..."
for i in {1..30}; do
    if curl -f -s http://localhost:2358/languages >/dev/null 2>&1; then
        echo "✅ Judge0 API is responding!"
        
        # Get language count
        lang_count=$(curl -s http://localhost:2358/languages | jq length)
        echo "📝 Available languages: $lang_count"
        
        # Test C++ submission
        echo "🧪 Testing C++ submission..."
        test_result=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
            -H "Content-Type: application/json" \
            -d '{"source_code": "#include <iostream>\nint main() { std::cout << \"Hello Judge0\"; return 0; }", "language_id": 54, "stdin": ""}')
        
        if echo "$test_result" | jq -r '.status.description' | grep -q "Accepted"; then
            echo "✅ C++ test PASSED"
        else
            echo "⚠️ C++ test result:"
            echo "$test_result" | jq .
        fi
        
        echo "🎉 Judge0 fix completed successfully!"
        exit 0
    fi
    echo "⏳ Waiting for API... ($i/30)"
    sleep 5
done

echo "❌ API still not responding after 2.5 minutes"
echo "📋 Final container status:"
sudo docker ps -a
echo "📋 Service logs:"
sudo docker-compose logs --tail=20
exit 1
EOF

chmod +x /tmp/remote-fix.sh

echo "🚀 Executing fix on remote instance..."
scp -o StrictHostKeyChecking=no -i /tmp/judge0-debug-key.pem /tmp/remote-fix.sh ubuntu@$INSTANCE_IP:/tmp/
ssh -o StrictHostKeyChecking=no -i /tmp/judge0-debug-key.pem ubuntu@$INSTANCE_IP 'chmod +x /tmp/remote-fix.sh && /tmp/remote-fix.sh'

echo "🎯 Fix completed! Judge0 should now be accessible at http://$INSTANCE_IP:2358"
echo "🧪 You can test it with: curl http://$INSTANCE_IP:2358/languages"

# Clean up
rm -f /tmp/remote-fix.sh 