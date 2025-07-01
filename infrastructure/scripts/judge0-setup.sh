#!/bin/bash
set -e

# Judge0 Setup Script for EC2 Automation
# This script installs and configures Judge0 with optimizations for high throughput

echo "🚀 Starting Judge0 setup automation..."

# System preparation
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

echo "🐳 Installing Docker and Docker Compose..."
apt-get install -y docker.io docker-compose jq curl wget unzip python3-pip

echo "☁️ Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Start Docker service
systemctl start docker
systemctl enable docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

echo "⬇️ Downloading Judge0..."
cd /opt
wget -q https://github.com/judge0/judge0/releases/download/v1.13.0/judge0-v1.13.0.zip
unzip -q judge0-v1.13.0.zip
cd judge0-v1.13.0

# Generate secure database password
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

echo "⚙️ Creating optimized Judge0 configuration..."
cat > judge0.conf << EOF
# Database Configuration
DB_HOST=db
DB_USERNAME=judge0
DB_PASSWORD=${DB_PASSWORD}

# Redis Configuration  
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/1
REDIS_PASSWORD=${REDIS_PASSWORD}

# Performance Optimizations
WORKERS_MAX=4
ENABLE_WAIT_RESULT=true
MAX_QUEUE_SIZE=1000
MAX_CPU_TIME_LIMIT=10
MAX_MEMORY_LIMIT=512000
MAX_PROCESSES_AND_OR_THREADS=60

# API Configuration
ENABLE_COMPILER_OPTIONS=true
ALLOWED_LANGUAGES_FOR_COMPILE_OPTIONS=44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78

# Security
ENABLE_SUBMISSION_DELETE=false
ENABLE_WAIT_RESULT=true

# Batch Processing
ENABLE_BATCHED_SUBMISSIONS=true
MAX_SUBMISSION_BATCH_SIZE=20

# Timeouts
SUBMISSION_CACHE_DURATION=86400
EOF

# Create docker-compose override for performance
echo "🔧 Creating performance-optimized docker-compose..."
cat > docker-compose.production.yml << EOF
version: '3.7'
services:
  server:
    environment:
      - WORKERS_MAX=4
      - MAX_QUEUE_SIZE=1000
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    restart: unless-stopped
    
  workers:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    restart: unless-stopped
    
  db:
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

echo "🏗️ Starting Judge0 services..."
# Start database and redis first
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d db redis

echo "⏳ Waiting for database to be ready..."
sleep 30

# Check if database is ready
for i in {1..30}; do
  if docker-compose exec -T db pg_isready -U judge0 > /dev/null 2>&1; then
    echo "✅ Database is ready"
    break
  fi
  echo "⏳ Waiting for database... ($i/30)"
  sleep 5
done

# Start all services
echo "🚀 Starting all Judge0 services..."
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d

echo "⏳ Waiting for Judge0 API to be ready..."
# Wait for services to be ready with enhanced checking
for i in {1..60}; do
  if curl -f http://localhost:2358/languages > /dev/null 2>&1; then
    echo "✅ Judge0 API is ready!"
    
    # Test basic functionality
    echo "🧪 Testing Judge0 functionality..."
    
    # Test C++ compilation
    CPP_TEST=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
      -H "Content-Type: application/json" \
      -d '{
        "source_code": "#include <iostream>\nint main() { std::cout << \"Hello Judge0\"; return 0; }",
        "language_id": 54,
        "stdin": ""
      }')
    
    if echo "$CPP_TEST" | jq -r '.status.description' | grep -q "Accepted"; then
      echo "✅ C++ test passed"
    else
      echo "❌ C++ test failed"
      echo "$CPP_TEST" | jq .
    fi
    
    # Test Python execution
    PYTHON_TEST=$(curl -s -X POST "http://localhost:2358/submissions?wait=true" \
      -H "Content-Type: application/json" \
      -d '{
        "source_code": "print(\"Hello from Python\")",
        "language_id": 71,
        "stdin": ""
      }')
    
    if echo "$PYTHON_TEST" | jq -r '.status.description' | grep -q "Accepted"; then
      echo "✅ Python test passed"
    else
      echo "❌ Python test failed"
      echo "$PYTHON_TEST" | jq .
    fi
    
    # Signal successful setup via AWS Systems Manager
    if command -v aws &> /dev/null; then
      TEST_ID=${1:-"default"}
      aws ssm put-parameter --name "/judge0/${TEST_ID}/status" --value "READY" --overwrite --region ${AWS_DEFAULT_REGION:-us-east-1} || echo "⚠️ Could not update SSM parameter"
    fi
    
    echo "🎉 Judge0 setup completed successfully!"
    exit 0
  fi
  echo "⏳ Waiting for Judge0 API... ($i/60)"
  sleep 10
done

# If we reach here, setup failed
echo "❌ Judge0 setup failed - API not responding after 10 minutes"
echo "📋 Docker container status:"
docker-compose ps

echo "📋 Recent logs:"
docker-compose logs --tail=50

# Signal failure
if command -v aws &> /dev/null; then
  TEST_ID=${1:-"default"}
  aws ssm put-parameter --name "/judge0/${TEST_ID}/status" --value "FAILED" --overwrite --region ${AWS_DEFAULT_REGION:-us-east-1} || echo "⚠️ Could not update SSM parameter"
fi

exit 1 