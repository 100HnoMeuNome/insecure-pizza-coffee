# Quick Start Guide

## Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- Datadog API Key

## Setup

### 1. Configure Environment
```bash
# Copy and edit your .env file
export DD_API_KEY="your-datadog-api-key"
export DD_SITE="datadoghq.com"
export DD_ENV="production"
```

### 2. Deploy Application

**Option A: Full CWS Support (Recommended)**
```bash
./deploy-with-cws.sh
```

**Option B: Standard Deployment**
```bash
docker-compose up -d
```

## Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Verify CWS is active
docker exec -it datadog-agent agent status | grep -A 10 "Runtime Security"

# Trigger mining simulation
docker exec -it pizzacoffee-app /app/mining-connection.sh

# Watch mining logs (runs every 2 minutes)
docker exec -it pizzacoffee-app tail -f /var/log/mining-connections.log
```

## Access Application

- **Web App**: http://localhost:3000
- **MySQL**: localhost:3306
- **Datadog APM**: localhost:8126

## What to Expect

### Cryptomining Simulation
- Connections to mining pools every 2 minutes
- Logs at `/var/log/mining-connections.log`
- Targets: ethermine.org, miningocean.org, c3pool.com

### Datadog Detections
Check your Datadog account for:
- **Security → Workload Security → Threats**
  - "Cryptocurrency mining pool connection detected"
  - "Suspicious network activity"

- **Security → Application Security → Signals**
  - SQL Injection attempts (in app vulnerabilities)
  - XSS vulnerabilities
  - IDOR vulnerabilities

- **Security → Code Security → Secret Scanning**
  - Hardcoded API keys in source code
  - Facebook, LinkedIn, Twitter tokens

### Timeline
- **0-2 min**: Services start, agent connects
- **2-5 min**: First mining connection attempt
- **5-10 min**: Detections appear in Datadog UI
- **Every 2 min**: Repeated mining connections (continuous monitoring)

## Troubleshooting

### Agent not connecting
```bash
docker logs datadog-agent | grep -i error
```

### Mining script not running
```bash
docker exec -it pizzacoffee-app crontab -l
docker exec -it pizzacoffee-app ps aux | grep cron
```

### Check CWS status
```bash
docker exec -it datadog-agent agent status
```

## Stop Application

```bash
# Stop all services
docker-compose down

# If using deploy-with-cws.sh
docker stop datadog-agent && docker rm datadog-agent
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v
```

## Key Files

- `docker-compose.yml` - Service orchestration
- `deploy-with-cws.sh` - Full CWS deployment script
- `mining-connection.sh` - Cryptomining simulation
- `social-media-config.js` - Hardcoded secrets
- `src/views/index.ejs` - Homepage with social media integration

## Documentation

- `DATADOG-CWS-SETUP.md` - Complete CWS configuration guide
- `DEPLOYMENT-OPTIONS.md` - Deployment options comparison
- `MINING-SIMULATION.md` - Mining simulation details

## Support

For issues, check:
1. Docker and Docker Compose versions
2. Datadog API key is valid
3. Agent logs: `docker logs datadog-agent`
4. Application logs: `docker logs pizzacoffee-app`
