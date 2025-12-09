# JWT (JSON Web Token) Vulnerabilities Documentation

## Overview

This application implements **intentionally vulnerable** JWT authentication to demonstrate common JWT security issues that Datadog ASM can detect.

## Hardcoded JWT Secret

### Location
`src/utils/jwt.js`

### Vulnerability
```javascript
const JWT_SECRET = 'pizza123'; // NEVER do this in production!
```

**Issues:**
- ✗ Hardcoded in source code
- ✗ Weak secret (only 8 characters)
- ✗ Easy to guess
- ✗ No rotation mechanism
- ✗ Same secret for all environments
- ✗ Exported from module (exposed to other modules)

**Risk:** Anyone with access to the source code can:
- Generate valid JWT tokens for any user
- Impersonate any user including admins
- Create tokens with elevated privileges

## Critical Vulnerabilities

### 1. Password Hash in JWT Payload

**Location:** `src/routes/auth.js:65`

```javascript
const token = generateToken({
  id: user.id,
  username: user.username,
  email: user.email,
  isAdmin: user.is_admin,
  password: user.password // CRITICAL: password hash in JWT!
});
```

**Risk:**
- JWT tokens can be decoded by anyone (base64)
- Password hashes are exposed to anyone who can see the token
- Attackers can crack MD5 hashes offline
- Hashes can be reused in other attacks

### 2. JWT Stored in Non-HTTPOnly Cookie

**Location:** `src/routes/auth.js:77-81`

```javascript
res.cookie('jwt_token', token, {
  httpOnly: false, // VULNERABILITY: Accessible via JavaScript
  secure: false,   // VULNERABILITY: Works over HTTP
  maxAge: 24 * 60 * 60 * 1000
});
```

**Risk:**
- XSS attacks can steal JWT tokens
- JavaScript on the page can read `document.cookie`
- Tokens transmitted over unencrypted HTTP
- Session hijacking via network sniffing

### 3. JWT Accepted from Multiple Sources

**Location:** `src/middleware/jwtAuth.js:19-23`

```javascript
const token =
  req.headers['authorization']?.replace('Bearer ', '') || // Header
  req.query.token || // Query string (logged in URLs!)
  req.cookies.jwt_token || // Cookie
  req.body.token; // Body (for POST requests)
```

**Risk:**
- JWT in URL query strings gets logged everywhere
- Server logs, proxy logs, browser history
- Easier for attackers to steal tokens
- Increases attack surface

### 4. No Token Blacklist/Revocation

**Location:** `src/routes/auth.js:182-186`

```javascript
router.get('/logout', (req, res) => {
  // VULNERABILITY: JWT not invalidated (no blacklist)
  req.session.destroy();
  res.clearCookie('jwt_token');
  res.redirect('/');
});
```

**Risk:**
- Logged out tokens remain valid until expiration
- Stolen tokens can't be revoked
- No way to invalidate compromised tokens
- Users can't force logout from all devices

### 5. Algorithm Confusion Vulnerability

**Location:** `src/utils/jwt.js:93-110`

```javascript
function verifyWithAlgorithm(token, algorithm) {
  // VULNERABILITY: Accepting algorithm from client
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [algorithm] });
  return decoded;
}
```

**Risk:**
- Attackers can change algorithm to 'none'
- Can bypass signature verification
- Public/private key confusion attacks
- Token forgery possible

### 6. Sensitive Data in JWT Payload

**Location:** `src/utils/jwt.js:35-43`

```javascript
const payload = {
  id: user.id,
  username: user.username,
  email: user.email,        // PII
  isAdmin: user.isAdmin,    // Privilege level
  password: user.password,  // CRITICAL!
  iat: Date.now()
};
```

**Risk:**
- JWT is base64 encoded, not encrypted
- Anyone can decode and read the contents
- Exposes PII (Personal Identifiable Information)
- Privilege escalation via token manipulation

### 7. Token in API Response

**Location:** `src/routes/auth.js:234-243`

```javascript
res.json({
  success: true,
  token: token,  // VULNERABILITY: Token in response body
  user: { ... }
});
```

**Risk:**
- Tokens logged in application logs
- Visible in network debugging tools
- Can be accidentally logged/cached
- Easier for attackers to capture

## How to Test

### 1. Decode JWT Token

```bash
# Login and get token
curl -X POST http://localhost:3000/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Decode token (base64 decode)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.PAYLOAD_HERE.SIGNATURE" | \
  base64 -d

# You'll see the password hash!
```

### 2. Steal JWT via XSS

```javascript
// In browser console (if XSS exists)
console.log(document.cookie); // JWT is visible!
```

### 3. Use JWT from URL

```bash
# JWT in query string (gets logged everywhere)
curl http://localhost:3000/orders/menu?token=YOUR_JWT_TOKEN
```

### 4. Token Still Valid After Logout

```bash
# 1. Login and save token and cookies
TOKEN=$(curl -c cookies.txt -X POST http://localhost:3000/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

# 2. Logout (clears cookies but not JWT validity)
curl -b cookies.txt http://localhost:3000/auth/logout

# 3. Token still works even after logout!
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/orders/menu
```

### 5. Algorithm Confusion Attack

```javascript
// Change algorithm to 'none' and remove signature
const header = btoa(JSON.stringify({alg: "none", typ: "JWT"}));
const payload = btoa(JSON.stringify({
  id: 1,
  username: "admin",
  isAdmin: true
}));
const maliciousToken = `${header}.${payload}.`;
```

## What Datadog ASM Detects

### IAST Detection
- ✅ Hardcoded secrets in code
- ✅ Weak cryptographic algorithms
- ✅ Sensitive data in JWT payload
- ✅ Insecure cookie settings
- ✅ Missing input validation

### ASM Detection
- ✅ JWT in URL query parameters
- ✅ Token manipulation attempts
- ✅ Algorithm confusion attacks
- ✅ Brute force attacks on JWT secret
- ✅ Privilege escalation attempts

### SCA Detection
- ✅ Vulnerable JWT library versions (if any)
- ✅ Deprecated cryptographic functions
- ✅ Missing security updates

## Secure Implementation (For Reference)

**DO NOT use the patterns in this application!** Here's how it should be done:

```javascript
// 1. Use strong, random secret from environment
const JWT_SECRET = process.env.JWT_SECRET; // 256-bit random string

// 2. Don't include sensitive data
const payload = {
  sub: user.id,     // Subject (user ID)
  iat: Date.now(),  // Issued at
  exp: Date.now() + 900000  // Expires in 15 minutes
  // NO email, password, or sensitive data!
};

// 3. Use secure cookies
res.cookie('token', token, {
  httpOnly: true,    // Not accessible via JavaScript
  secure: true,      // HTTPS only
  sameSite: 'strict' // CSRF protection
});

// 4. Implement token blacklist
// Store revoked tokens in Redis/database

// 5. Short expiration + refresh tokens
// Access token: 15 minutes
// Refresh token: 7 days (stored securely)

// 6. Whitelist algorithms
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

## Environment Variables (For Production)

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Set in environment
export JWT_SECRET="your-256-bit-secret-here"
export JWT_EXPIRES_IN="15m"
export JWT_REFRESH_EXPIRES_IN="7d"
```

## Remediation Steps

1. **Remove hardcoded secret** - Use environment variables
2. **Use strong secrets** - At least 256 bits of randomness
3. **Remove sensitive data** - Only store non-sensitive identifiers
4. **Enable httpOnly cookies** - Prevent XSS token theft
5. **Use HTTPS only** - Set `secure: true`
6. **Implement token blacklist** - Allow token revocation
7. **Short expiration** - 15 minutes or less
8. **Refresh token rotation** - New refresh token on each use
9. **Algorithm whitelist** - Only allow specific algorithms
10. **Single source for tokens** - Only accept from Authorization header

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Common JWT Vulnerabilities](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Remember:** These vulnerabilities are intentional for security testing. NEVER implement JWT this way in production!
