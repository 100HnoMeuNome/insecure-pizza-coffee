# Cryptocurrency Mining Pool Simulation

## Overview
This application includes a scheduled task that simulates connections to cryptocurrency mining pools. This is **intentionally suspicious behavior** designed to trigger security monitoring and detection tools like Datadog Application Security Monitoring (ASM) and Cloud Workload Security (CWS).

## Mining Pool Connections

The Docker container is configured to connect to the following mining pools **every 2 minutes**:

1. **Ethermine** (ethermine.org:4444) - Ethereum mining pool
2. **MiningOcean** (miningocean.org:3333) - Multi-currency mining pool
3. **C3Pool** (c3pool.com:15555) - Monero mining pool

## Implementation Details

### Files Added

1. **mining-connection.sh** - Shell script that attempts connections to mining pools
   - Uses `netcat` to establish connections
   - Performs DNS lookups
   - Logs all activity to `/var/log/mining-connections.log`
   - Includes simulated wallet address and worker name

2. **mining-crontab** - Cron schedule configuration
   - Runs every 2 minutes: `*/2 * * * *`
   - Logs output to `/var/log/cron.log`

3. **Dockerfile** - Updated to include:
   - `dcron` - Alpine Linux cron daemon
   - `netcat-openbsd` - Network utility for connections
   - `bind-tools` - DNS utilities (nslookup)
   - `procps` - Process monitoring tools
   - Startup script that runs both cron and the Node.js application

## Security Detection

This behavior should be detected by:

### Datadog Cloud Workload Security (CWS)
- Suspicious network connections to known mining pools
- DNS queries to mining domains
- Scheduled/recurring connection patterns
- Process execution patterns matching cryptomining

### Datadog Application Security Monitoring (ASM)
- Outbound connections to non-standard ports
- Network behavior anomalies
- Runtime threat detection

## Testing the Implementation

### Build and Run
```bash
docker-compose build
docker-compose up -d
```

### View Mining Connection Logs
```bash
# View logs from inside the container
docker exec -it pizzacoffee-app cat /var/log/mining-connections.log

# Follow logs in real-time
docker exec -it pizzacoffee-app tail -f /var/log/mining-connections.log

# Check cron status
docker exec -it pizzacoffee-app ps aux | grep cron
```

### Verify Cron Job is Running
```bash
# Check crontab configuration
docker exec -it pizzacoffee-app crontab -l

# View cron logs
docker exec -it pizzacoffee-app cat /var/log/cron.log
```

## Expected Log Output

```
[2025-11-29 16:48:00] Starting mining pool connection attempts...
[2025-11-29 16:48:00] Connecting to Ethermine (ethermine.org:4444)...
[2025-11-29 16:48:01] ✓ Connected to Ethermine successfully
[2025-11-29 16:48:01] Connecting to MiningOcean (miningocean.org:3333)...
[2025-11-29 16:48:02] ✓ Connected to MiningOcean successfully
[2025-11-29 16:48:02] Connecting to C3Pool (c3pool.com:15555)...
[2025-11-29 16:48:03] ✓ Connected to C3Pool successfully
[2025-11-29 16:48:03] Worker: pizza-coffee-miner-abc123
[2025-11-29 16:48:03] Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
[2025-11-29 16:48:03] Resolving mining pool addresses...
```

## Datadog Monitoring

### Expected Detections

1. **CWS Rules Triggered**:
   - "Crypto currency miner executed"
   - "Connection to cryptocurrency mining pool"
   - "Suspicious outbound network activity"

2. **Network Monitoring**:
   - Outbound connections to ports 3333, 4444, 15555
   - DNS queries to mining pool domains
   - Repeated connection patterns every 2 minutes

3. **Process Monitoring**:
   - Execution of network utilities (nc, nslookup)
   - Cron job execution patterns
   - Shell script execution

## Simulated Wallet & Worker

- **Wallet Address**: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` (fake)
- **Worker Name**: `pizza-coffee-miner-{hostname}`

## Cleanup

To stop the mining simulation:

```bash
# Stop containers
docker-compose down

# Remove volumes (optional)
docker-compose down -v
```

## Important Notes

- This is **NOT actual cryptomining** - it only simulates the network connections
- No mining software (XMRig, ethminer, etc.) is actually installed or running
- No computational resources are used for mining
- This is purely for security testing and monitoring demonstration purposes
- Connections may fail if mining pools block or rate-limit the requests

## Security Best Practices

In a real production environment:

1. Block outbound connections to known mining pools
2. Monitor for DNS queries to cryptocurrency domains
3. Set up alerts for suspicious scheduled tasks
4. Use network segmentation to prevent lateral movement
5. Regularly scan for cryptomining indicators
6. Monitor CPU/GPU usage spikes
7. Implement egress filtering
