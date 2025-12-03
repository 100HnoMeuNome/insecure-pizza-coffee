# Datadog Application Security Management (ASM) Setup

This document describes the Datadog ASM configuration for the Insecure Pizza & Coffee application.

## ✅ Configuration Complete

Datadog Application Security Management has been successfully enabled and configured according to the [official documentation](https://docs.datadoghq.com/security/application_security/setup/).

## 📋 What Was Configured

### 1. Application Code (`src/server.js`)

The Datadog tracer is initialized at the very top of `server.js` (before any other imports) with the following ASM features:

- **Application Security Monitoring (ASM)**: Detects and blocks security attacks
- **API Security**: Monitors API endpoints for vulnerabilities
- **Interactive Application Security Testing (IAST)**: Identifies vulnerabilities in running code
- **Remote Configuration**: Enables dynamic security rule updates from Datadog UI

### 2. Environment Variables

All necessary environment variables are configured in `.env` and `.env.example`:

```bash
# Application Security Management (ASM)
DD_APPSEC_ENABLED=true                    # Enable ASM threat detection

# Interactive Application Security Testing (IAST)
DD_IAST_ENABLED=true                      # Enable IAST vulnerability detection

# Software Composition Analysis (SCA)
DD_APPSEC_SCA_ENABLED=true                # Enable SCA for dependency scanning

# Remote Configuration
DD_REMOTE_CONFIGURATION_ENABLED=true      # Enable remote configuration and blocking
```

**Note:** ASM, IAST, and SCA use Datadog's default settings for optimal performance. Advanced configuration options are available in the [Datadog documentation](https://docs.datadoghq.com/security/application_security/) if needed.

### 3. Docker Configuration

The `docker-compose.yml` has been updated to pass all ASM-related environment variables to both:
- The application container
- The Datadog Agent container

### 4. Package Dependencies

Required packages are installed:
- `dd-trace@^5.0.0` - Includes ASM, IAST, and SCA capabilities

## 🧪 Verification

Run the ASM configuration test:

```bash
npm run test-asm
```

This will verify:
- ✅ All required environment variables are set
- ✅ ASM, IAST, and SCA are enabled
- ✅ dd-trace package is properly installed
- ✅ Configuration is ready for use

## 🚀 Usage

### Running the Application

**Local Development:**
```bash
npm start
```

**Docker Compose:**
```bash
docker-compose up -d
```

### Generating Security Events

The application contains intentional vulnerabilities that will trigger ASM detections:

1. **SQL Injection**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin' OR '1'='1&password=anything"
   ```

2. **Category-based SQL Injection**
   ```bash
   curl "http://localhost:3000/orders/menu?category=pizza' OR '1'='1"
   ```

3. **IDOR (Insecure Direct Object Reference)**
   ```bash
   curl "http://localhost:3000/orders/my-orders?userId=2"
   ```

4. **Command Injection**
   - Login as admin
   - Navigate to `/admin/dashboard`
   - Execute system commands in the admin panel

## 📊 Viewing Results in Datadog

### Application Security Signals
1. Navigate to: https://app.datadoghq.com/security/appsec
2. View detected attacks, threats, and security signals
3. Analyze attack patterns and trends

### IAST Vulnerabilities
1. Navigate to: https://app.datadoghq.com/security/appsec/vm
2. View detected code-level vulnerabilities
3. Review remediation guidance

### SCA Results
1. Navigate to: https://app.datadoghq.com/security/appsec/vm
2. View vulnerable dependencies
3. Check for available patches

### APM Traces with Security
1. Navigate to: https://app.datadoghq.com/apm/traces
2. Filter by service: `insecure-pizza-coffee`
3. View security context in trace details

## 🔒 Enabling Blocking Mode

By default, ASM runs in monitoring mode. To enable blocking mode, use the Datadog UI:

1. Navigate to [Datadog ASM Settings](https://app.datadoghq.com/security/appsec)
2. Go to **Protection** → **In-App WAF** → **Configure**
3. Enable blocking for specific attack patterns or globally
4. Changes are applied automatically via Remote Configuration (no application restart needed)

**Note:** Remote Configuration must be enabled (`DD_REMOTE_CONFIGURATION_ENABLED=true`) for blocking mode to work (already configured).

## 🎯 ASM Features Enabled

| Feature | Status | Description |
|---------|--------|-------------|
| **Threat Detection** | ✅ Enabled | Detects SQLi, XSS, Command Injection, etc. |
| **Threat Protection** | ⚠️ Monitor Mode | Enable blocking in Datadog UI |
| **API Security** | ✅ Enabled | Monitors API endpoints for vulnerabilities |
| **IAST** | ✅ Enabled | Runtime vulnerability detection |
| **SCA** | ✅ Enabled | Dependency vulnerability scanning |
| **Remote Config** | ✅ Enabled | Dynamic rule updates from Datadog |
| **Attack Patterns** | ✅ Enabled | OWASP Top 10 and CVE-based detection |

## 📚 Additional Resources

- [Datadog ASM Documentation](https://docs.datadoghq.com/security/application_security/)
- [Datadog IAST Documentation](https://docs.datadoghq.com/security/application_security/iast/)
- [Datadog SCA Documentation](https://docs.datadoghq.com/security/application_security/software_composition_analysis/)
- [ASM Threat Detection Rules](https://docs.datadoghq.com/security/application_security/threats/)
- [Blocking Mode Configuration](https://docs.datadoghq.com/security/application_security/threats/protection/)

## 🛠️ Troubleshooting

### ASM Not Detecting Threats

1. Verify ASM is enabled:
   ```bash
   npm run test-asm
   ```

2. Check application logs:
   ```bash
   docker-compose logs app
   ```

3. Verify Datadog Agent is receiving data:
   ```bash
   docker-compose exec datadog-agent agent status
   ```

### IAST Not Finding Vulnerabilities

1. Ensure sufficient traffic is being generated
2. IAST requires the application to execute the vulnerable code paths
3. IAST uses default sampling settings optimized by Datadog

### No Data in Datadog UI

1. Verify `DD_API_KEY` is correct
2. Check network connectivity to Datadog
3. Verify the Datadog Agent is running:
   ```bash
   docker-compose ps datadog-agent
   ```

## ✅ Verification Checklist

- [x] dd-trace initialized at the top of server.js
- [x] DD_APPSEC_ENABLED=true in environment
- [x] DD_IAST_ENABLED=true in environment
- [x] DD_APPSEC_SCA_ENABLED=true in environment
- [x] DD_REMOTE_CONFIGURATION_ENABLED=true in environment
- [x] API Security enabled
- [x] Datadog Agent configured for ASM
- [x] Test script passes (`npm run test-asm`)
- [x] Dependencies installed correctly

---

**Setup completed successfully!** 🎉

Your application is now protected by Datadog Application Security Management.
