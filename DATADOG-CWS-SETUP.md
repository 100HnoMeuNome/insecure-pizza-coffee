# Datadog Cloud Workload Security (CWS) Setup

## Overview

This application is configured with **Datadog Cloud Workload Security (CWS)** to detect runtime threats, including the simulated cryptomining activity. The configuration follows the official [Datadog CWS Docker setup documentation](https://docs.datadoghq.com/security/workload_protection/setup/agent/docker/).

## CWS Features Enabled

### 1. Runtime Security
- **eBPF-based monitoring** - Monitors system calls, file access, network activity
- **Process execution monitoring** - Detects suspicious process creation
- **Network activity monitoring** - Tracks outbound connections to mining pools
- **File integrity monitoring** - Detects unauthorized file modifications

### 2. Compliance & Host Benchmarks
- **CIS Docker Benchmark** - Validates container security best practices
- **Host configuration checks** - Ensures secure host configuration
- **Compliance reporting** - Automated compliance posture assessment

### 3. Remote Configuration
- **Dynamic rule updates** - Rules updated automatically from Datadog
- **No agent restart required** - Configuration changes applied in real-time

## Docker Compose Configuration

### Required Flags & Settings

#### Container Namespace Settings
```yaml
cgroupns_mode: host  # Access host cgroup namespace
pid: host            # Access host PID namespace for process monitoring
```

#### Security Options
```yaml
security_opt:
  - apparmor:unconfined  # Disable AppArmor to allow eBPF operations
```

#### Linux Capabilities
```yaml
cap_add:
  - SYS_ADMIN          # Required for eBPF program loading
  - SYS_RESOURCE       # Required for resource management
  - SYS_PTRACE         # Required for process tracing
  - NET_ADMIN          # Required for network monitoring
  - NET_BROADCAST      # Required for network operations
  - NET_RAW            # Required for raw socket access
  - IPC_LOCK           # Required for memory locking
  - CHOWN              # Required for file ownership operations
```

#### Volume Mounts
```yaml
volumes:
  # Core monitoring volumes
  - /var/run/docker.sock:/var/run/docker.sock:ro    # Docker API access
  - /proc/:/host/proc/:ro                            # Process information
  - /sys/fs/cgroup/:/host/sys/fs/cgroup:ro          # Container metrics

  # CWS-specific volumes
  - /:/host/root:ro                                  # Full filesystem access for FIM
  - /etc/passwd:/etc/passwd:ro                       # User information
  - /etc/group:/etc/group:ro                         # Group information
  - /sys/kernel/debug:/sys/kernel/debug              # Kernel debug (eBPF)
  - /etc/os-release:/etc/os-release:ro              # OS information
```

### Environment Variables

#### Cloud Workload Security
```yaml
# Runtime Security (Core CWS)
DD_RUNTIME_SECURITY_CONFIG_ENABLED: true
DD_RUNTIME_SECURITY_CONFIG_REMOTE_CONFIGURATION_ENABLED: true

# Compliance Monitoring
DD_COMPLIANCE_CONFIG_ENABLED: true
DD_COMPLIANCE_CONFIG_HOST_BENCHMARKS_ENABLED: true

# Host Root Path
HOST_ROOT: /host/root

# Remote Configuration
DD_REMOTE_CONFIGURATION_ENABLED: true
```

#### Application Security Management
```yaml
DD_APPSEC_ENABLED: true
DD_APPSEC_SCA_ENABLED: true  # Software Composition Analysis
```

#### Process & Container Monitoring
```yaml
DD_PROCESS_AGENT_ENABLED: true
DD_CONTAINER_EXCLUDE: "name:datadog-agent"
```

## Expected Threat Detections

With CWS fully enabled, the following threats should be detected:

### 1. Cryptomining Activity
- **Rule**: "Cryptocurrency mining pool connection detected"
- **Trigger**: Outbound connections to ethermine.org, miningocean.org, c3pool.com
- **Severity**: HIGH

### 2. Suspicious Network Activity
- **Rule**: "Suspicious outbound connection to uncommon port"
- **Trigger**: Connections to ports 3333, 4444, 15555
- **Severity**: MEDIUM

### 3. Process Execution
- **Rule**: "Network utility executed"
- **Trigger**: Execution of netcat (nc) command
- **Severity**: MEDIUM

### 4. DNS Queries
- **Rule**: "DNS query to cryptocurrency domain"
- **Trigger**: nslookup queries to mining pool domains
- **Severity**: MEDIUM

### 5. Scheduled Task Execution
- **Rule**: "Cron job executed suspicious command"
- **Trigger**: Cron running mining-connection.sh every 2 minutes
- **Severity**: LOW

## Deployment

### 1. Ensure API Key is Set
```bash
export DD_API_KEY="your-api-key-here"
export DD_SITE="datadoghq.com"
export DD_ENV="production"
```

### 2. Build and Deploy
```bash
# Build the application
docker-compose build

# Start all services
docker-compose up -d

# Verify Datadog agent is running
docker-compose ps datadog-agent
```

### 3. Verify CWS is Active
```bash
# Check agent status
docker exec -it datadog-agent agent status

# Look for Runtime Security section
docker exec -it datadog-agent agent status | grep -A 10 "Runtime Security"

# Check compliance status
docker exec -it datadog-agent agent status | grep -A 10 "Compliance"
```

## Verification Commands

### Check eBPF Programs Loaded
```bash
# View loaded eBPF programs (from host)
sudo bpftool prog list | grep datadog

# Check if agent has proper permissions
docker exec -it datadog-agent ls -l /sys/kernel/debug
```

### Monitor CWS Events
```bash
# View runtime security logs
docker logs datadog-agent | grep "Runtime Security"

# View threat detections
docker logs datadog-agent | grep -i "threat\|security\|mining"
```

### Test Mining Detection
```bash
# Trigger mining connection immediately
docker exec -it pizzacoffee-app /app/mining-connection.sh

# View the logs
docker exec -it pizzacoffee-app cat /var/log/mining-connections.log
```

## Datadog UI - Where to Find Detections

### Security Signals
1. Navigate to **Security → Application Security → Signals**
2. Look for signals with rules containing:
   - "Cryptocurrency"
   - "Mining pool"
   - "Suspicious network"

### Cloud Workload Security
1. Navigate to **Security → Cloud Security Management → Workload Security**
2. Check **Threats** tab for runtime detections
3. Check **Findings** tab for compliance issues

### Compliance Posture
1. Navigate to **Security → Cloud Security Management → Compliance**
2. View **CIS Docker Benchmark** results
3. Check **Misconfigurations** and **Findings**

## Troubleshooting

### CWS Not Detecting Events

#### Check Agent Logs
```bash
docker logs datadog-agent 2>&1 | grep -i "runtime\|security\|ebpf"
```

#### Verify Kernel Requirements
```bash
# Linux kernel should be 4.15+ for eBPF
uname -r

# Check if eBPF is supported
cat /boot/config-$(uname -r) | grep BPF
```

#### Verify Permissions
```bash
# Agent should have SYS_ADMIN capability
docker inspect datadog-agent | grep -A 20 CapAdd

# Check volume mounts
docker inspect datadog-agent | grep -A 30 Mounts
```

### Common Issues

#### Issue: "Runtime Security agent is not running"
**Solution**: Ensure `DD_RUNTIME_SECURITY_CONFIG_ENABLED=true` and restart:
```bash
docker-compose restart datadog-agent
```

#### Issue: "eBPF programs failed to load"
**Solution**: Check kernel version and AppArmor settings:
```bash
# Disable AppArmor for agent container
docker-compose down
docker-compose up -d
```

#### Issue: "No mining pool detections appearing"
**Solution**:
1. Wait 2-5 minutes for detections to appear in UI
2. Verify Remote Configuration is enabled
3. Check that default CWS rules are active in Datadog UI

## Performance Impact

The CWS agent has minimal performance impact:
- **CPU**: ~1-2% baseline, up to 5% during active monitoring
- **Memory**: ~200-300 MB
- **Network**: Minimal (only sends security events)
- **Disk I/O**: Minimal (log file writes only)

## Security Considerations

### Production Deployment
When deploying CWS in production:

1. **Review privileges**: The agent requires extensive privileges - ensure proper network isolation
2. **Monitor agent logs**: Set up alerts for agent health issues
3. **Regular updates**: Keep agent image updated for latest detection rules
4. **Incident response**: Define runbooks for detected threats
5. **Alert tuning**: Tune detection rules to reduce false positives

### Testing Environment
This setup is ideal for:
- Security testing and validation
- Threat detection demonstrations
- Security training scenarios
- Compliance testing
- DevSecOps pipeline validation

## Additional Resources

- [Datadog CWS Documentation](https://docs.datadoghq.com/security/cloud_workload_security/)
- [CWS Agent Setup for Docker](https://docs.datadoghq.com/security/workload_protection/setup/agent/docker/)
- [CWS Default Rules](https://docs.datadoghq.com/security/default_rules/#cat-workload-security)
- [Threat Detection Rules](https://docs.datadoghq.com/security/threats/)
- [Compliance Monitoring](https://docs.datadoghq.com/security/cloud_security_management/compliance/)

## Summary

This configuration provides **complete Cloud Workload Security monitoring** with:
- ✅ Runtime threat detection (eBPF-based)
- ✅ Cryptomining detection (mining pool connections)
- ✅ Compliance monitoring (CIS benchmarks)
- ✅ Process and network monitoring
- ✅ File integrity monitoring
- ✅ Remote configuration for dynamic updates

The simulated mining activity should trigger multiple security signals in your Datadog account within 2-5 minutes of deployment.
