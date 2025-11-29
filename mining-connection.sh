#!/bin/sh
# Mining Pool Connection Script
# WARNING: This script simulates cryptomining activity for security testing purposes
# This is intentionally suspicious behavior to trigger security monitoring tools

LOG_FILE="/var/log/mining-connections.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Mining pool endpoints
ETHERMINE="ethermine.org:4444"
MININGOCEAN="miningocean.org:3333"
C3POOL="c3pool.com:15555"

echo "[$TIMESTAMP] Starting mining pool connection attempts..." >> $LOG_FILE

# Attempt connection to Ethermine
echo "[$TIMESTAMP] Connecting to Ethermine ($ETHERMINE)..." >> $LOG_FILE
if nc -zv -w 5 ethermine.org 4444 2>&1 | tee -a $LOG_FILE; then
    echo "[$TIMESTAMP] ✓ Connected to Ethermine successfully" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ✗ Failed to connect to Ethermine" >> $LOG_FILE
fi

# Attempt connection to MiningOcean
echo "[$TIMESTAMP] Connecting to MiningOcean ($MININGOCEAN)..." >> $LOG_FILE
if nc -zv -w 5 miningocean.org 3333 2>&1 | tee -a $LOG_FILE; then
    echo "[$TIMESTAMP] ✓ Connected to MiningOcean successfully" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ✗ Failed to connect to MiningOcean" >> $LOG_FILE
fi

# Attempt connection to C3Pool
echo "[$TIMESTAMP] Connecting to C3Pool ($C3POOL)..." >> $LOG_FILE
if nc -zv -w 5 c3pool.com 15555 2>&1 | tee -a $LOG_FILE; then
    echo "[$TIMESTAMP] ✓ Connected to C3Pool successfully" >> $LOG_FILE
else
    echo "[$TIMESTAMP] ✗ Failed to connect to C3Pool" >> $LOG_FILE
fi

# Simulate sending worker credentials
WALLET_ADDRESS="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
WORKER_NAME="pizza-coffee-miner-$(hostname)"

echo "[$TIMESTAMP] Worker: $WORKER_NAME" >> $LOG_FILE
echo "[$TIMESTAMP] Wallet: $WALLET_ADDRESS" >> $LOG_FILE

# DNS lookups (common mining behavior)
echo "[$TIMESTAMP] Resolving mining pool addresses..." >> $LOG_FILE
nslookup ethermine.org >> $LOG_FILE 2>&1
nslookup miningocean.org >> $LOG_FILE 2>&1
nslookup c3pool.com >> $LOG_FILE 2>&1

echo "[$TIMESTAMP] Mining connection cycle completed" >> $LOG_FILE
echo "----------------------------------------" >> $LOG_FILE

# Keep some suspicious metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 || echo "N/A")
echo "[$TIMESTAMP] CPU Usage: ${CPU_USAGE}%" >> $LOG_FILE
