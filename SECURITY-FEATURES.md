# Security Testing Features Summary

This application is intentionally insecure and includes multiple security testing features designed to trigger Datadog's security monitoring products.

## 🔐 Datadog Security Products Covered

### 1. Cloud Workload Security (CWS)
**Purpose**: Runtime threat detection for workloads

**What's Enabled**:
- ✅ eBPF-based runtime monitoring
- ✅ Process execution monitoring
- ✅ Network activity monitoring
- ✅ File integrity monitoring
- ✅ Compliance benchmarks (CIS Docker)

**Test Case**: Cryptomining Simulation
- Scheduled connections to mining pools every 2 minutes
- Targets: ethermine.org, miningocean.org, c3pool.com
- Uses netcat, DNS lookups, and cron jobs
- **Location**: `mining-connection.sh`, `mining-crontab`

**Expected Detections**:
- "Cryptocurrency mining pool connection detected"
- "Suspicious network activity"
- "Network utility executed"
- "DNS query to cryptocurrency domain"

---

### 2. Application Security Management (ASM)
**Purpose**: Runtime application attack detection

**What's Enabled**:
- ✅ RASP (Runtime Application Self-Protection)
- ✅ Attack detection and blocking
- ✅ API security monitoring
- ✅ IAST (Interactive Application Security Testing)
- ✅ SCA (Software Composition Analysis)

**Test Cases**: Built-in vulnerabilities
- **SQL Injection**: Login bypass, data extraction
- **XSS**: Stored and reflected XSS in comments
- **IDOR**: Access other users' orders
- **Authentication bypass**: Weak session management
- **Path traversal**: File access vulnerabilities

**Expected Detections**:
- SQL injection attempts
- XSS payloads
- Unauthorized data access
- Session hijacking attempts

---

### 3. Code Security (Secret Scanning)
**Purpose**: Detect hardcoded secrets in source code

**What's Included**:
- ✅ Facebook Access Token (EAACEdEose0cBA...)
- ✅ LinkedIn Client Secret (16 lowercase alphanumeric)
- ✅ Twitter Access Tokens (2 formats)
- ✅ Hardcoded in multiple locations

**Test Cases**: Hardcoded Secrets
- **JavaScript**: `social-media-config.js`
- **HTML/Browser**: `social-media-icons.html`
- **EJS Template**: `src/views/index.ejs`

**Expected Detections**:
- Facebook access token detected
- LinkedIn secret detected
- Twitter access token detected
- Secrets in version control

---

### 4. Software Composition Analysis (SCA)
**Purpose**: Identify vulnerable dependencies

**What's Enabled**:
- ✅ Automatic dependency scanning
- ✅ Vulnerability detection in npm packages
- ✅ License compliance checking

**Expected Detections**:
- Outdated packages with known CVEs
- High-severity vulnerabilities
- Vulnerable transitive dependencies

---

## 🎯 Attack Scenarios by Feature

### Cryptomining Detection (CWS)
```bash
# Automatic every 2 minutes, or trigger manually:
docker exec -it pizzacoffee-app /app/mining-connection.sh
```

**Detection Time**: 2-5 minutes
**Severity**: HIGH
**Datadog Location**: Security → Workload Security → Threats

---

### Web Application Attacks (ASM)
```bash
# SQL Injection
curl "http://localhost:3000/api/search?q=pizza' OR '1'='1"

# XSS
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{"comment":"<script>alert(1)</script>"}'

# IDOR
curl http://localhost:3000/api/orders/1
curl http://localhost:3000/api/orders/999
```

**Detection Time**: Real-time
**Severity**: HIGH-CRITICAL
**Datadog Location**: Security → Application Security → Signals

---

### Secret Scanning (Code Security)
```bash
# Commit code with secrets
git add .
git commit -m "Add social media integration"
git push origin main
```

**Detection Time**: On commit/push (with GitHub integration)
**Severity**: CRITICAL
**Datadog Location**: Security → Code Security → Secret Scanning

---

## 📊 Expected Datadog Dashboard Activity

### Security Signals (First 24 Hours)
- 🔴 **Critical**: 5-10 signals (hardcoded secrets, SQL injection)
- 🟠 **High**: 10-20 signals (cryptomining, XSS attacks)
- 🟡 **Medium**: 20-50 signals (suspicious network activity)
- 🔵 **Low**: 50+ signals (compliance findings)

### CWS Threats
- Cryptomining connections: ~720 per day (every 2 minutes)
- Network anomalies: Continuous
- Process anomalies: Multiple per hour

### ASM Attacks
- SQL injection attempts: On-demand testing
- XSS attempts: On-demand testing
- IDOR attempts: On-demand testing
- Authentication bypass: On-demand testing

### Code Security
- Secret detections: On commit
- Vulnerable dependencies: Daily scan

---

## 🚀 Deployment Configuration

### docker-compose.yml
**Services**:
- `mysql`: Database with intentionally weak credentials
- `app`: Node.js application with vulnerabilities
- `datadog-agent`: Full monitoring with CWS enabled

**Key Configurations**:
```yaml
# App Service
DD_APPSEC_ENABLED: true
DD_IAST_ENABLED: true
DD_API_SECURITY_ENABLED: true

# Agent Service
DD_RUNTIME_SECURITY_CONFIG_ENABLED: true
DD_COMPLIANCE_CONFIG_ENABLED: true
DD_PROCESS_AGENT_ENABLED: true
```

### deploy-with-cws.sh
Alternative deployment with full CWS support including `--cgroupns host`

---

## 🔍 Monitoring Commands

### Check CWS Status
```bash
docker exec -it datadog-agent agent status | grep -A 10 "Runtime Security"
```

### View Mining Logs
```bash
docker exec -it pizzacoffee-app tail -f /var/log/mining-connections.log
```

### Monitor Security Events
```bash
docker logs -f datadog-agent | grep -i "security\|threat\|attack"
```

### Check Application Logs
```bash
docker logs -f pizzacoffee-app | grep -i "error\|attack\|sql"
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `QUICK-START.md` | Getting started guide |
| `DATADOG-CWS-SETUP.md` | Complete CWS configuration |
| `DEPLOYMENT-OPTIONS.md` | Deployment methods comparison |
| `MINING-SIMULATION.md` | Cryptomining details |
| `SECURITY-FEATURES.md` | This file - overview of all features |

---

## ⚠️ Important Notes

### This is a Test Environment
- **DO NOT** deploy to production
- **DO NOT** expose to public internet
- **DO NOT** use with real user data
- **DO NOT** store actual credentials

### Purpose
This application is designed for:
- ✅ Security training and demos
- ✅ Datadog product evaluation
- ✅ Security testing and validation
- ✅ DevSecOps pipeline testing
- ✅ Incident response practice

### Legal Use
- Only use in authorized test environments
- Ensure proper disclosure in demos
- Follow responsible disclosure practices
- Comply with local security testing laws

---

## 🎓 Learning Resources

### Datadog Documentation
- [Cloud Workload Security](https://docs.datadoghq.com/security/cloud_workload_security/)
- [Application Security Management](https://docs.datadoghq.com/security/application_security/)
- [Code Security](https://docs.datadoghq.com/security/code_security/)
- [Secret Scanning](https://docs.datadoghq.com/security/code_security/secret_scanning/)

### OWASP References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

---

## 🔄 Next Steps

1. **Deploy**: Use `deploy-with-cws.sh` or `docker-compose up -d`
2. **Verify**: Check agent status and logs
3. **Wait**: Allow 5-10 minutes for initial detections
4. **Explore**: Navigate to Datadog Security dashboards
5. **Test**: Try different attack scenarios
6. **Learn**: Understand detection patterns and responses

Happy security testing! 🛡️
