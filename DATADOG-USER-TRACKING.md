# Datadog ASM User Tracking and Blocking

## Overview

This application implements Datadog Application Security Management (ASM) user tracking and blocking capability according to the official documentation: https://docs.datadoghq.com/security/application_security/how-it-works/add-user-info?tab=nodejs

## Implementation Details

### 1. User Tracking on Every Request

**Location**: `src/server.js` (lines 99-141)

A global middleware tracks authenticated users on every request:

```javascript
app.use((req, res, next) => {
  if (req.session && req.session.userId && req.session.user) {
    try {
      tracer.setUser({
        id: req.session.userId.toString(),
        email: req.session.user.email || undefined,
        name: req.session.user.username || undefined,
        isAdmin: req.session.user.isAdmin || false,
        sessionId: req.sessionID || undefined
      });
    } catch (error) {
      // Handle user blocking
      if (error.type === 'aborted') {
        // User is blocked by ASM
      }
    }
  }
});
```

**What it does:**
- Automatically adds user information to every trace
- Enables Datadog ASM to track user behavior across all requests
- Detects when a user is blocked by ASM and handles it gracefully

### 2. User Tracking on Login

**Location**: `src/routes/auth.js`

#### Standard Login Endpoint (lines 14-130)
- Tracks successful logins with `tracer.setUser()`
- Tracks failed login attempts with appropriate tags
- Handles user blocking during login

#### API Login Endpoint (lines 203-300)
- Same tracking for API-based authentication
- Returns JSON response for blocked users

**User Information Tracked:**
- `id`: User ID (string)
- `email`: User email address
- `name`: Username
- `isAdmin`: Custom field indicating admin status
- `sessionId`: Session identifier

### 3. Login Event Tracking

The application tracks both successful and failed login attempts:

#### Successful Login
```javascript
span.setTag('appsec.events.users.login.success', true);
```

#### Failed Login
```javascript
// User not found
span.setTag('appsec.events.users.login.failure.usr.id', username);
span.setTag('appsec.events.users.login.failure.usr.exists', false);

// Invalid password
span.setTag('appsec.events.users.login.failure.usr.id', user.id.toString());
span.setTag('appsec.events.users.login.failure.usr.exists', true);
```

### 4. User Blocking Capability

When Datadog ASM blocks a user (via Remote Configuration), the application:

1. **Detects the block**: `tracer.setUser()` throws an error with `type: 'aborted'`
2. **Destroys the session**: Logs out the blocked user
3. **Clears cookies**: Removes JWT tokens
4. **Returns appropriate response**:
   - Web: 403 error page with message
   - API: JSON with `blocked: true`

**Example blocking response:**
```json
{
  "error": "Access blocked by security policy",
  "blocked": true,
  "reason": "Your account has been flagged for suspicious activity"
}
```

## How to Test User Blocking

### 1. Enable ASM with Blocking

Ensure these environment variables are set:

```bash
DD_APPSEC_ENABLED=true
DD_REMOTE_CONFIGURATION_ENABLED=true
```

Enable blocking mode in the Datadog UI (see [ASM-SETUP.md](ASM-SETUP.md#-enabling-blocking-mode) for instructions).

### 2. Create a User to Block

```bash
# Create a test user
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=attacker&password=test123"
```

### 3. Simulate Attack Behavior

```bash
# Login as the user
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=attacker&password=test123"

# Trigger SQL injection attacks (will be detected by ASM)
curl "http://localhost:3000/orders/menu?category=pizza' OR '1'='1'--" \
  -b cookies.txt

# Trigger command injection attempts
curl -X POST "http://localhost:3000/admin/system/execute" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"command": "whoami"}'
```

### 4. Block the User in Datadog

1. Go to **Security > Application Security > Protection**
2. Find the user `attacker` in the **Users** tab
3. Click **Block this user**
4. The block rule is deployed via Remote Configuration

### 5. Verify Blocking

```bash
# Try to login again - should be blocked
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=attacker&password=test123"
```

Expected response:
```html
<error>Access blocked by security policy. Your account has been flagged for suspicious activity.</error>
```

## User Information in Datadog

### APM Traces

All traces for authenticated users will include:

- `usr.id`: User ID
- `usr.name`: Username
- `usr.email`: Email address
- `usr.is_admin`: Admin status (custom field)

### ASM Security Signals

When attacks are detected, Datadog ASM will:

1. **Attribute attacks to users**: Know exactly which user performed the attack
2. **Track attack patterns**: See all attacks from a specific user
3. **Enable user-level blocking**: Block attackers at the user level, not just IP

### Example ASM Signal

```
SQL Injection detected
User: attacker (ID: 15)
Email: attacker@test.com
Attack: SQLi via category parameter
Rule: sql-injection-detection
Action: Monitor (or Block if enabled)
```

## Benefits of User Tracking

1. **Attack Attribution**: Know exactly who is attacking your application
2. **Insider Threat Detection**: Identify malicious authenticated users
3. **User-Level Blocking**: Block attackers even if they change IPs or devices
4. **Account Takeover Detection**: Detect suspicious behavior from compromised accounts
5. **Compliance**: Track security events at the user level for audit trails

## Environment Variables

```bash
# Enable ASM
DD_APPSEC_ENABLED=true

# Enable IAST
DD_IAST_ENABLED=true

# Enable SCA
DD_APPSEC_SCA_ENABLED=true

# Enable Remote Configuration (required for user blocking)
DD_REMOTE_CONFIGURATION_ENABLED=true

# Datadog API Key
DD_API_KEY=your_api_key_here

# Service and environment
DD_SERVICE=insecure-pizza-coffee
DD_ENV=development
DD_VERSION=1.0.0
```

## Limitations in This Vulnerable App

⚠️ **Important**: This is an intentionally vulnerable application for security testing. The following are vulnerabilities, not bugs:

1. **Session Hijacking**: Client-side sessions with weak secrets allow session manipulation
2. **No Rate Limiting**: No protection against brute force attacks
3. **SQL Injection**: Multiple SQL injection points can be used to enumerate users
4. **Weak Passwords**: MD5 hashing without salt makes password cracking trivial
5. **IDOR**: Users can access other users' data

**These vulnerabilities exist by design** to demonstrate Datadog ASM's detection capabilities.

## Testing Workflow

### Step 1: Normal User Flow
```bash
# Register
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=normaluser&password=password123"

# Login (user tracking starts)
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -c cookies.txt \
  -d "username=normaluser&password=password123"

# Browse menu (user tracked in traces)
curl "http://localhost:3000/orders/menu" -b cookies.txt
```

### Step 2: Attack Detection
```bash
# Trigger SQL injection (ASM detects attack)
curl "http://localhost:3000/orders/menu?category=pizza' UNION SELECT 1,2,3,4,5,6--" \
  -b cookies.txt

# Check Datadog ASM - you'll see:
# - Attack detected
# - Attributed to user: normaluser
# - User details visible in signal
```

### Step 3: User Blocking
```bash
# In Datadog UI, block the user
# Then try to access the application:

curl "http://localhost:3000/orders/menu" -b cookies.txt
# Response: 403 - Access blocked by security policy
```

## Documentation References

- [Datadog ASM - Add User Info](https://docs.datadoghq.com/security/application_security/how-it-works/add-user-info?tab=nodejs)
- [Datadog ASM - User Blocking](https://docs.datadoghq.com/security/application_security/threats/blocking/)
- [Datadog Remote Configuration](https://docs.datadoghq.com/agent/remote_config/)

## Summary

This implementation provides:

✅ **User tracking on all requests** - Every trace includes user information
✅ **Login event tracking** - Success and failure events are tracked
✅ **User blocking capability** - ASM can block users in real-time
✅ **Session termination** - Blocked users are immediately logged out
✅ **Attack attribution** - All attacks are attributed to specific users
✅ **Remote Configuration** - Blocking rules deployed without code changes

The application is now fully integrated with Datadog ASM for user-level security monitoring and protection.
