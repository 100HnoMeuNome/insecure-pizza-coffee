# Recent Changes and Improvements

## 🔄 Latest Updates (2025-11-19)

### 1. ⚠️ Replaced bcrypt with MD5 (Extremely Vulnerable!)

**Changed Files**:
- `src/routes/auth.js` - Switched from bcrypt to crypto.createHash('md5')
- `db/schema.sql` - Updated admin user password to MD5 hash
- `package.json` - Removed bcrypt dependency

**Why This Is Worse (Intentionally)**:
- **MD5 is cryptographically broken** - Known collision attacks
- **No salting** - Rainbow table attacks are trivial
- **Extremely fast** - Can crack billions of hashes per second with GPU
- **Deprecated** - NIST banned MD5 for cryptographic use since 2004
- **Instantly crackable** - Most common passwords in rainbow tables

**Test Credentials**:
```
Username: admin
Password: admin123
MD5 Hash: 0192023a7bbd73250516f069df18b500

Username: user
Password: password
MD5 Hash: 5f4dcc3b5aa765d61d8327deb882cf99
```

**What Datadog IAST Will Detect**:
- Weak hashing algorithm (MD5)
- A02:2021 – Cryptographic Failures
- Insecure password storage
- No salting mechanism
- Vulnerability severity: HIGH

**Example Attack**:
```bash
# Crack MD5 hash instantly with online tools
echo "0192023a7bbd73250516f069df18b500" | \
  curl -X POST https://md5decrypt.net/Api/api.php \
  -d "hash=$hash&decrypt=Decrypt"

# Or use hashcat
hashcat -m 0 -a 0 hashes.txt rockyou.txt
```

---

### 2. 📊 Comprehensive Datadog Instrumentation

Added detailed custom span tags to track every vulnerability:

#### SQL Injection Tracking
```javascript
span.setTag('vulnerability.type', 'sql_injection')
span.setTag('vulnerability.category', 'injection')
span.setTag('attack.vector', 'query_parameter')
span.setTag('sql.query', fullQuery)
span.setTag('http.client_ip', clientIP)
```

**Where**: `auth.js`, `orders.js`, `payment.js`, `admin.js`

**Benefits**:
- See exact SQL injection payloads in APM traces
- Track attack vectors (query params, body, etc.)
- Monitor which endpoints are targeted
- Correlate attacks with IP addresses

#### Command Injection Tracking
```javascript
span.setTag('vulnerability.type', 'command_injection')
span.setTag('vulnerability.severity', 'critical')
span.setTag('system.command', command)
span.setTag('command.success', true/false)
span.setTag('usr.id', userId)
```

**Where**: `admin.js` - `/admin/system/execute`

**Benefits**:
- Full visibility into executed system commands
- Track who ran dangerous commands
- Monitor command success/failure
- Correlate with Workload Security events

#### Sensitive Data Exposure Tracking
```javascript
span.setTag('vulnerability.type', 'sensitive_data_exposure')
span.setTag('sensitive.data_type', 'payment_card')
span.setTag('pci.compliance', 'none')
span.setTag('payment.card_number', cardNumber) // Intentional!
span.setTag('payment.cvv', cvv) // Intentional!
span.setTag('storage.plaintext_sensitive_data', true)
```

**Where**: `payment.js`

**Benefits**:
- Track credit card data flowing through system
- Monitor PCI compliance violations
- Detect when sensitive data is logged
- Alert on plaintext storage

#### Weak Cryptography Tracking
```javascript
span.setTag('vulnerability.type', 'weak_crypto')
span.setTag('vulnerability.category', 'cryptographic_failure')
span.setTag('crypto.algorithm', 'md5')
span.setTag('crypto.purpose', 'password_hashing')
```

**Where**: `auth.js` - Login and registration

**Benefits**:
- Identify weak hashing algorithms
- Track cryptographic operations
- Monitor compliance with standards
- Alert on deprecated algorithms

#### Authentication Tracking
```javascript
// Success
span.setTag('auth.success', true)
span.setTag('usr.id', userId)
span.setTag('usr.name', username)
span.setTag('usr.is_admin', isAdmin)
span.setTag('session.id', sessionId)

// Failure
span.setTag('auth.failure', 'user_not_found|invalid_password')
```

**Where**: `auth.js`

**Benefits**:
- Track successful authentications
- Monitor failed login attempts
- Detect brute force attacks
- Identify compromised accounts

#### Username Enumeration Tracking
```javascript
span.setTag('vulnerability.type', 'username_enumeration')
span.setTag('enumeration.result', 'user_exists|user_not_found')
span.setTag('vulnerability.type', 'information_disclosure')
```

**Where**: `auth.js` - Password reset

**Benefits**:
- Detect username enumeration attempts
- Track information disclosure
- Monitor account discovery attacks

#### Arbitrary SQL Execution Tracking
```javascript
span.setTag('vulnerability.type', 'arbitrary_sql_execution')
span.setTag('vulnerability.severity', 'critical')
span.setTag('sql.query', userQuery)
span.setTag('sql.validation', 'none')
span.setTag('query.row_count', count)
```

**Where**: `admin.js` - Database query executor

**Benefits**:
- Track admin SQL queries
- Monitor dangerous operations
- Alert on data access patterns
- Audit administrative actions

---

## 📈 Enhanced Visibility

### Before vs After

**Before (Basic)**:
```
POST /auth/login
└── express.request (200ms)
    └── mysql.query (50ms)
```

**After (Comprehensive)**:
```
POST /auth/login
└── express.request (200ms)
    ├── vulnerability.type: sql_injection
    ├── vulnerability.category: injection
    ├── sql.query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
    ├── attack.vector: sql
    ├── http.client_ip: 192.168.1.100
    ├── vulnerability.type: weak_crypto
    ├── crypto.algorithm: md5
    ├── auth.failure: user_not_found
    └── mysql.query (50ms)
        └── sql.query: SELECT * FROM users...
```

---

## 🎯 What You Can Now Do in Datadog

### 1. Query Specific Vulnerabilities
```
# Find all SQL injection attempts
service:insecure-pizza-coffee vulnerability.type:sql_injection

# Track command injection
service:insecure-pizza-coffee vulnerability.type:command_injection

# Monitor sensitive data
service:insecure-pizza-coffee sensitive.data_type:payment_card

# Weak crypto usage
service:insecure-pizza-coffee crypto.algorithm:md5
```

### 2. Create Custom Dashboards

**SQL Injection Dashboard**:
- Count by attack vector
- Top targeted endpoints
- Geographic distribution
- Success vs failure rate

**Authentication Dashboard**:
- Failed login attempts
- Successful auths by user
- Admin access patterns
- Session creation rate

**Sensitive Data Dashboard**:
- Payment data access
- Credit card transactions
- PCI violations
- Plaintext storage events

### 3. Set Up Alerts

**Critical Alerts**:
```yaml
Command Injection:
  trigger: vulnerability.type:command_injection
  priority: P1
  notify: Security team

SQL Injection Spike:
  trigger: count(vulnerability.type:sql_injection) > 10 in 5min
  priority: P2
  notify: Security team
```

**Compliance Alerts**:
```yaml
Sensitive Data Exposure:
  trigger: sensitive.data_type:payment_card AND usr.is_admin:false
  priority: P1
  notify: Compliance team

Weak Crypto Usage:
  trigger: crypto.algorithm:md5 OR crypto.algorithm:sha1
  priority: P3
  notify: Engineering team
```

### 4. Generate Custom Metrics

```python
# Attack rate by type
count(vulnerability.type:*) by {vulnerability.type}

# Failed auth by user
count(auth.failure:*) by {usr.name}

# Command injection by admin
count(vulnerability.type:command_injection) by {usr.id}

# Sensitive data access rate
rate(sensitive.data_type:payment_card)
```

---

## 🔍 Testing the Improvements

### Test MD5 Weakness

1. **Crack admin password**:
```bash
# Hash: 0192023a7bbd73250516f069df18b500
# Instantly reversible with online tools
curl "https://md5decrypt.net/en/Api/api.php?hash=0192023a7bbd73250516f069df18b500&decrypt=Decrypt"
# Result: admin123
```

2. **View in Datadog**:
- Navigate to APM → Traces
- Filter: `service:insecure-pizza-coffee crypto.algorithm:md5`
- View span tags showing MD5 usage

### Test Comprehensive Instrumentation

1. **SQL Injection Attack**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -d "username=admin' OR '1'='1&password=test"
```

2. **View in Datadog APM**:
- Find trace for POST /auth/login
- Expand span details
- See tags:
  - `vulnerability.type: sql_injection`
  - `sql.query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'`
  - `attack.vector: sql`

3. **View in Datadog ASM**:
- Navigate to Security → Application Security
- See SQL injection security signal
- View attack details and patterns

### Test Command Injection

1. **Execute command**:
```bash
# Login as admin, go to /admin/dashboard
# Execute: cat /etc/passwd
```

2. **View in Datadog**:
- APM: Full command in span tags
- Workload Security: Process execution alert
- Tags show user, command, success/failure

---

## 📚 New Documentation

Added **DATADOG_INSTRUMENTATION.md** with:
- Complete tag reference
- Vulnerability-by-vulnerability breakdown
- Example traces and queries
- Dashboard and alert templates
- Testing procedures
- Best practices

---

## 🔧 Migration Notes

### If Updating from Previous Version

1. **Remove node_modules**:
```bash
rm -rf node_modules
npm install
```

2. **Reinitialize database**:
```bash
# Docker Compose
docker-compose down -v
docker-compose up -d
docker-compose exec app npm run init-db

# Local
mysql -u root -p < db/schema.sql
```

3. **New credentials** (MD5 hashes):
```
admin / admin123
user / password
```

---

## 🎓 Learning Opportunities

### MD5 Weaknesses

Students can now:
- See why MD5 is dangerous
- Practice cracking MD5 hashes
- Understand rainbow table attacks
- Compare with secure alternatives (bcrypt, Argon2)
- View IAST detection of weak crypto

### Instrumentation Patterns

Developers can learn:
- How to instrument security events
- Custom APM tagging strategies
- Correlation between different security tools
- Security observability best practices
- Incident response workflows

---

## ⚠️ Security Impact (Intentional)

### Increased Attack Surface

1. **Weaker passwords** - MD5 vs bcrypt makes all passwords trivial to crack
2. **Better visibility** - Every attack is now fully traced and tagged
3. **Teaching tool** - Demonstrates real-world vulnerabilities comprehensively

### What Makes This Worse

| Aspect | Before (bcrypt) | After (MD5) | Impact |
|--------|----------------|-------------|---------|
| Hash time | ~100ms | <1ms | 100x faster cracking |
| GPU cracking | ~100k/sec | ~50B/sec | 500,000x faster |
| Rainbow tables | No | Yes | Instant lookups |
| Collision attacks | No | Yes | Hash manipulation |
| Compliance | Acceptable | Banned | NIST non-compliant |

---

## 📊 Datadog Feature Showcase

This update showcases:

✅ **APM Custom Tagging** - Comprehensive vulnerability tracking
✅ **ASM Detection** - Real-time attack identification
✅ **IAST Scanning** - Code-level vulnerability detection (MD5)
✅ **Workload Security** - Runtime command monitoring
✅ **Data Scanner** - PII and sensitive data detection
✅ **Custom Dashboards** - Security-focused visualization
✅ **Alert Workflows** - Automated incident response

---

## 🔗 Related Files

- `DATADOG_INSTRUMENTATION.md` - Complete instrumentation guide
- `SECURITY.md` - Vulnerability catalog
- `README.md` - Main documentation
- `QUICKSTART.md` - Fast setup guide

---

**Summary**: The application is now MORE vulnerable (MD5 instead of bcrypt) and MORE observable (comprehensive Datadog instrumentation), making it an even better security testing and training tool!

Last Updated: 2025-11-19
