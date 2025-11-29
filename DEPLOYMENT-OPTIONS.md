# Deployment Options for CWS

## Issue with docker-compose.yml and cgroupns

The `--cgroupns host` flag required for full CWS support is not available in Docker Compose v3.8 format. This is a known limitation.

## Solution: Two Deployment Options

### Option 1: Use the Deployment Script (Recommended)

Use the provided `deploy-with-cws.sh` script which uses `docker run` with all required CWS flags:

```bash
# Set your Datadog API key
export DD_API_KEY="your-api-key-here"
export DD_SITE="datadoghq.com"
export DD_ENV="production"

# Run the deployment script
./deploy-with-cws.sh
```

**What it does:**
- Starts MySQL and App using docker-compose
- Deploys Datadog Agent using `docker run` with `--cgroupns host`
- Includes all required CWS capabilities and volume mounts
- Provides verification commands

### Option 2: Standard docker-compose (Partial CWS)

Use standard docker-compose for most CWS features:

```bash
docker-compose down
docker-compose up -d
```

**What's included:**
- ✅ Runtime Security monitoring
- ✅ Process monitoring
- ✅ Network monitoring
- ✅ File integrity monitoring (most features)
- ✅ Compliance checks
- ⚠️ Missing: Full cgroup namespace isolation (--cgroupns host)

**Impact:**
The agent will still detect most threats including cryptomining, but may have limited visibility into certain cgroup-level operations.

## Comparison

| Feature | deploy-with-cws.sh | docker-compose |
|---------|-------------------|----------------|
| Runtime Security | ✅ Full | ✅ Full |
| Process Monitoring | ✅ Full | ✅ Full |
| Network Monitoring | ✅ Full | ✅ Full |
| File Integrity Monitoring | ✅ Full | ✅ Most |
| Cgroup Namespace Isolation | ✅ Yes (`--cgroupns host`) | ⚠️ Limited |
| Compliance Checks | ✅ Full | ✅ Full |
| Mining Detection | ✅ Full | ✅ Full |
| Easy to Deploy | ✅ Single script | ✅ Single command |

## Recommendation

**For maximum security detection and CWS compatibility:**
- Use `deploy-with-cws.sh` script

**For quick testing or if cgroupns is not critical:**
- Use `docker-compose up -d`

Both options will detect the cryptomining simulation successfully.

## Verification

After deployment with either option:

```bash
# Check agent status
docker exec -it datadog-agent agent status

# Verify CWS is active
docker exec -it datadog-agent agent status | grep -A 10 "Runtime Security"

# Trigger mining detection
docker exec -it pizzacoffee-app /app/mining-connection.sh

# View mining logs
docker exec -it pizzacoffee-app tail -f /var/log/mining-connections.log
```

## Docker Compose v2 Alternative

If you have Docker Compose v2.0+, you can update the docker-compose.yml to use the newer format that supports `cgroupns_mode`. However, the deployment script is more portable and guaranteed to work.

## Clean Up

```bash
# Stop all containers
docker-compose down

# If using deploy-with-cws.sh, also stop the manually created agent
docker stop datadog-agent
docker rm datadog-agent

# Clean up volumes (optional)
docker-compose down -v
```
