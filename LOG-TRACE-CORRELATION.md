# Log and Trace Correlation with Datadog

## Overview

This application implements **automatic log and trace correlation** using Datadog APM and Winston logging. This allows you to seamlessly navigate between logs and traces in Datadog, providing complete observability for debugging and troubleshooting.

**Documentation Reference**: https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/

## Implementation Details

### 1. Winston Logger Configuration

**Location**: `src/config/logger.js`

The application uses Winston with a custom Datadog format that automatically injects trace context into every log entry:

```javascript
const datadogFormat = winston.format((info) => {
  const span = tracer.scope().active();

  if (span) {
    info.dd = {
      trace_id: span.context().toTraceId(),
      span_id: span.context().toSpanId(),
      service: process.env.DD_SERVICE,
      env: process.env.DD_ENV,
      version: process.env.DD_VERSION
    };
  }

  return info;
});
```

### 2. Log Format

Logs are emitted in JSON format with the following structure:

```json
{
  "level": "info",
  "message": "User logged in successfully",
  "timestamp": "2025-12-03T20:30:45.123Z",
  "dd": {
    "trace_id": "1234567890123456789",
    "span_id": "9876543210987654321",
    "service": "insecure-pizza-coffee",
    "env": "production",
    "version": "1.0.0"
  },
  "user_id": 1,
  "username": "testuser",
  "ip": "172.18.0.1"
}
```

### 3. Datadog Tracer Configuration

**Location**: `src/server.js` (lines 1-22)

The tracer is initialized with log injection enabled:

```javascript
const tracer = require('dd-trace').init({
  logInjection: true,  // Enable automatic log correlation
  runtimeMetrics: true,
  profiling: true,
  // ... ASM, IAST, etc.
});
```

### 4. Environment Variables

**Required for Log-Trace Correlation**:

```bash
# Enable trace log injection
DD_LOGS_INJECTION=true

# Service identification
DD_SERVICE=insecure-pizza-coffee
DD_ENV=production
DD_VERSION=1.0.0

# Enable APM
DD_TRACE_ENABLED=true

# Enable log collection
DD_LOGS_ENABLED=true
DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL=true
```

## How It Works

### Automatic Trace Context Injection

1. **Request arrives** → Datadog tracer creates a span
2. **Logger is called** → Winston format function executes
3. **Active span detected** → Trace IDs are extracted
4. **Log enriched** → `dd.trace_id` and `dd.span_id` added
5. **Log sent to Datadog** → Agent collects and correlates

### Correlation Fields

| Field | Description | Example |
|-------|-------------|---------|
| `dd.trace_id` | Unique trace identifier | `1234567890123456789` |
| `dd.span_id` | Current span identifier | `9876543210987654321` |
| `dd.service` | Service name | `insecure-pizza-coffee` |
| `dd.env` | Environment | `production` |
| `dd.version` | Application version | `1.0.0` |

## Usage Examples

### 1. Login Events

```javascript
// Successful login
logger.info('User logged in successfully', {
  user_id: user.id,
  username: user.username,
  email: user.email,
  is_admin: user.is_admin,
  ip: req.ip
});

// Failed login
logger.warn('Login failed - user not found', {
  username,
  ip: req.ip,
  user_agent: req.headers['user-agent']
});
```

### 2. Error Logging

```javascript
logger.error('Application error occurred', {
  error: err.message,
  stack: err.stack,
  url: req.url,
  method: req.method,
  user: req.session?.user?.username || 'anonymous'
});
```

### 3. Application Startup

```javascript
logger.info('Insecure Pizza & Coffee application started', {
  port: PORT,
  environment: process.env.NODE_ENV,
  dd_apm_enabled: process.env.DD_TRACE_ENABLED === 'true',
  dd_asm_enabled: process.env.DD_APPSEC_ENABLED === 'true'
});
```

## Viewing in Datadog

### From Trace to Logs

1. Navigate to **APM → Traces**
2. Click on any trace
3. Look for the **Logs** tab in the trace details
4. All logs with matching `trace_id` will be displayed

### From Logs to Traces

1. Navigate to **Logs → Explorer**
2. Find a log entry with trace context
3. Click the **APM** icon or trace ID
4. Jump directly to the correlated trace

### Log Query Examples

```
# Find all logs for a specific trace
@dd.trace_id:1234567890123456789

# Find login-related logs with traces
message:"logged in" @dd.trace_id:*

# Find errors with trace context
status:error @dd.trace_id:*

# Find logs from specific user with traces
@user_id:1 @dd.trace_id:*
```

## Log Files

Logs are written to:

- **Console**: Colorized, human-readable format
- **File**: `/var/log/pizzacoffee/app.log` (JSON format)
- **Exceptions**: `/var/log/pizzacoffee/exceptions.log`
- **Rejections**: `/var/log/pizzacoffee/rejections.log`

The Datadog Agent automatically collects logs from containers.

## Benefits

### 1. **Faster Debugging**
- See all logs related to a failed request
- Trace the execution path alongside log messages
- Identify the exact code path that triggered an error

### 2. **Complete Context**
- User information in logs
- Request details in traces
- Error stack traces correlated with spans

### 3. **Security Investigations**
- Track malicious user activity across logs and traces
- Correlate security events with user actions
- Investigate attack patterns with full context

### 4. **Performance Analysis**
- See what was logged during slow requests
- Correlate database queries with timing
- Identify bottlenecks with detailed logging

## Testing Log-Trace Correlation

### Step 1: Generate Activity

```bash
# Login to generate correlated logs and traces
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=wrongpassword"
```

### Step 2: View in Datadog APM

1. Go to **APM → Traces**
2. Filter: `service:insecure-pizza-coffee`
3. Find the POST /auth/login trace
4. Click on the trace

### Step 3: View Correlated Logs

In the trace details:
1. Click the **Logs** tab
2. See the correlated log: "Login failed - invalid password"
3. View all contextual information

### Step 4: View in Logs Explorer

1. Go to **Logs → Explorer**
2. Search: `@dd.trace_id:* message:"Login failed"`
3. Click on a log entry
4. Click the APM icon to jump to the trace

## Log Levels

The application uses standard log levels:

| Level | Usage | Example |
|-------|-------|---------|
| `error` | Application errors, exceptions | Database connection failed |
| `warn` | Warning conditions | Failed login attempt |
| `info` | Informational messages | User logged in successfully |
| `debug` | Debug information | SQL query executed |

Set log level via environment variable:
```bash
LOG_LEVEL=debug  # Options: error, warn, info, debug
```

## Configuration Options

### Winston Transports

**Console Transport** (Development):
```javascript
new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, dd }) => {
      return `${timestamp} [${level}] [dd.trace_id=${dd.trace_id}]: ${message}`;
    })
  )
})
```

**File Transport** (Production):
```javascript
new winston.transports.File({
  filename: '/var/log/pizzacoffee/app.log',
  format: winston.format.json(),
  maxsize: 5242880, // 5MB
  maxFiles: 5
})
```

### Datadog Agent Configuration

The agent is configured to collect logs automatically:

```yaml
# docker-compose.yml
DD_LOGS_ENABLED: true
DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL: true
DD_LOGS_CONFIG_AUTO_MULTI_LINE_DETECTION: true
```

## Troubleshooting

### Logs Missing Trace Context

**Problem**: Logs don't have `dd.trace_id`

**Solution**:
1. Verify `DD_LOGS_INJECTION=true` is set
2. Ensure tracer is initialized before logging
3. Check that logger is called within a trace context

### Traces Not Appearing in Logs Tab

**Problem**: Trace has no associated logs

**Solution**:
1. Verify logs are being sent to Datadog
2. Check that `service` names match between APM and Logs
3. Ensure timestamps are synchronized

### File Logging Errors

**Problem**: Cannot write to log files

**Solution**:
```bash
# Create log directory
mkdir -p /var/log/pizzacoffee
chmod 777 /var/log/pizzacoffee
```

## Best Practices

### 1. **Structured Logging**
Always use structured logs with context:
```javascript
// Good
logger.info('User action completed', { user_id, action, result });

// Bad
logger.info(`User ${user_id} completed ${action}`);
```

### 2. **Include Request Context**
Add relevant request information:
```javascript
logger.warn('Suspicious activity', {
  user_id,
  ip: req.ip,
  url: req.url,
  method: req.method,
  user_agent: req.headers['user-agent']
});
```

### 3. **Log Security Events**
Always log security-relevant events:
- Login attempts (success/failure)
- Authorization failures
- Suspicious input patterns
- Command injection attempts
- SQL injection attempts

### 4. **Avoid Sensitive Data**
Never log sensitive information:
```javascript
// Bad - logs password!
logger.info('Login attempt', { username, password });

// Good
logger.info('Login attempt', { username });
```

## Security Monitoring with Correlated Logs

### Detect Attack Patterns

The log-trace correlation is especially valuable for security monitoring:

```javascript
// SQL Injection attempt
logger.warn('SQL injection detected', {
  user_id,
  query: suspiciousQuery,
  ip: req.ip,
  endpoint: req.url
});

// Command injection attempt
logger.warn('Command injection detected', {
  user_id,
  command: suspiciousCommand,
  ip: req.ip,
  input_field: 'order_notes'
});
```

In Datadog:
1. Security signal triggers in ASM
2. Correlated log provides context
3. Trace shows full request flow
4. User activity is tracked

## Additional Resources

- [Datadog Log-Trace Correlation Docs](https://docs.datadoghq.com/tracing/other_telemetry/connect_logs_and_traces/)
- [Winston Logger Documentation](https://github.com/winstonjs/winston)
- [Datadog APM Documentation](https://docs.datadoghq.com/tracing/)
- [Log Management in Datadog](https://docs.datadoghq.com/logs/)

---

**✅ Log and Trace Correlation is now fully configured!**

Your application automatically correlates logs with traces, providing complete observability for debugging, monitoring, and security investigations.
