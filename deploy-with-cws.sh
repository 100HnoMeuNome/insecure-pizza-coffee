#!/bin/bash
# Deploy Datadog Agent with Full CWS Support
# This script deploys the Datadog agent with --cgroupns host for full CWS compatibility

set -e

echo "🚀 Deploying Insecure Pizza Coffee with Full Datadog CWS Support"
echo "================================================================"

# Check if DD_API_KEY is set
if [ -z "$DD_API_KEY" ]; then
    echo "❌ Error: DD_API_KEY environment variable is not set"
    echo "Please set it with: export DD_API_KEY='your-api-key'"
    exit 1
fi

# Set defaults
DD_SITE=${DD_SITE:-datadoghq.com}
DD_ENV=${DD_ENV:-production}

echo "✅ DD_API_KEY is set"
echo "✅ DD_SITE: $DD_SITE"
echo "✅ DD_ENV: $DD_ENV"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Start MySQL and App with docker-compose
echo "🐬 Starting MySQL database..."
docker-compose up -d mysql

echo "⏳ Waiting for MySQL to be ready..."
sleep 10

echo "🍕 Starting Pizza Coffee application..."
docker-compose up -d app

echo "⏳ Waiting for application to be ready..."
sleep 5

# Stop the docker-compose datadog agent (we'll run it manually)
docker-compose stop datadog-agent 2>/dev/null || true
docker-compose rm -f datadog-agent 2>/dev/null || true

# Run Datadog agent with proper CWS configuration
echo "🐶 Starting Datadog Agent with full CWS configuration..."
docker run -d \
  --name datadog-agent \
  --network insecure-pizza-coffee_pizzacoffee-network \
  --cgroupns host \
  --pid host \
  --ipc host \
  --security-opt apparmor:unconfined \
  --cap-add SYS_ADMIN \
  --cap-add SYS_RESOURCE \
  --cap-add SYS_PTRACE \
  --cap-add NET_ADMIN \
  --cap-add NET_BROADCAST \
  --cap-add NET_RAW \
  --cap-add IPC_LOCK \
  --cap-add CHOWN \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /proc/:/host/proc/:ro \
  -v /sys/fs/cgroup/:/host/sys/fs/cgroup:ro \
  -v /etc/passwd:/etc/passwd:ro \
  -v /etc/group:/etc/group:ro \
  -v /:/host/root:ro \
  -v /sys/kernel/debug:/sys/kernel/debug \
  -v /etc/os-release:/etc/os-release:ro \
  -p 8126:8126 \
  -e DD_API_KEY="$DD_API_KEY" \
  -e DD_SITE="$DD_SITE" \
  -e DD_HOSTNAME=pizzacoffee-docker \
  -e DD_TAGS="env:$DD_ENV service:insecure-pizza-coffee" \
  -e DD_APM_ENABLED=true \
  -e DD_APM_NON_LOCAL_TRAFFIC=true \
  -e DD_APM_RECEIVER_PORT=8126 \
  -e DD_APPSEC_ENABLED=true \
  -e DD_APPSEC_SCA_ENABLED=true \
  -e DD_RUNTIME_SECURITY_CONFIG_ENABLED=true \
  -e DD_RUNTIME_SECURITY_CONFIG_REMOTE_CONFIGURATION_ENABLED=true \
  -e DD_COMPLIANCE_CONFIG_ENABLED=true \
  -e DD_COMPLIANCE_CONFIG_HOST_BENCHMARKS_ENABLED=true \
  -e HOST_ROOT=/host/root \
  -e DD_REMOTE_CONFIGURATION_ENABLED=true \
  -e DD_PROCESS_AGENT_ENABLED=true \
  -e DD_CONTAINER_EXCLUDE="name:datadog-agent" \
  -e DD_LOGS_ENABLED=true \
  -e DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true \
  -e DD_CONTAINER_LABELS_AS_TAGS='{"*":"%%label%%"}' \
  --restart unless-stopped \
  gcr.io/datadoghq/agent:latest

echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo ""
echo "📊 Services Status:"
docker-compose ps
echo ""
docker ps --filter "name=datadog-agent" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🔍 Verify CWS is running:"
echo "   docker exec -it datadog-agent agent status | grep -A 10 'Runtime Security'"
echo ""
echo "🔐 Monitor for mining detections:"
echo "   docker logs -f datadog-agent | grep -i 'security\\|threat\\|mining'"
echo ""
echo "⏱️  Mining connections run every 2 minutes automatically"
echo "   Manual trigger: docker exec -it pizzacoffee-app /app/mining-connection.sh"
echo ""
echo "📝 View mining logs:"
echo "   docker exec -it pizzacoffee-app cat /var/log/mining-connections.log"
echo ""
echo "🌐 Application URL: http://localhost:3000"
echo ""
