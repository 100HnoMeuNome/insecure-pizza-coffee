# Vulnerable Packages Documentation

## Print Order Functionality

The "Print Order" feature in the My Orders page uses **intentionally outdated and vulnerable** open-source libraries to demonstrate software composition analysis (SCA) detection capabilities.

## Vulnerable Libraries Used

### 1. PDFKit v0.11.0 (Released ~2015)

**Package:** `pdfkit@0.11.0`

**Why it's vulnerable:**
- Extremely outdated version (current version is 0.15+)
- Missing security patches from the last 8+ years
- Uses deprecated dependencies with known vulnerabilities
- No modern security features

**Known Issues:**
- Outdated crypto dependencies
- Vulnerable to various PDF injection attacks
- Missing input validation in older versions
- Uses old versions of `crypto-js` with CVEs

### 2. Handlebars v4.5.3 (Released 2019)

**Package:** `handlebars@4.5.3`

**CVEs:**
- **CVE-2019-19919** (Critical) - Prototype Pollution
  - CVSS Score: 9.8
  - Allows attackers to add/modify properties of Object.prototype
  - Can lead to remote code execution

- **CVE-2019-20920** (Critical) - Arbitrary Code Execution
  - CVSS Score: 9.8
  - Lookup helper can execute arbitrary JavaScript

- **CVE-2021-23369** (Critical) - RCE via Template Injection
  - CVSS Score: 9.8
  - Remote attackers can execute arbitrary code through specially crafted templates

**Known Issues:**
- Prototype pollution vulnerability
- Template injection leading to RCE
- Insufficient input sanitization
- Allows arbitrary code execution through lookupProperty

## Security Risks Demonstrated

### 1. Software Composition Analysis (SCA) Detection
- Datadog ASM's SCA feature will detect these vulnerable packages
- Shows vulnerability severity, CVE numbers, and remediation guidance

### 2. Dependency Chain Vulnerabilities
These packages pull in vulnerable sub-dependencies:
- `minimist@0.0.10` - CVE-2021-44906 (Prototype Pollution)
- `crypto-js@3.3.0` - GHSA-xwcq-pm8m-c4vf (PBKDF2 1000 iterations)

### 3. Insecure Direct Object Reference (IDOR)
The print endpoint has no authorization check - any authenticated user can print any order by changing the order ID.

### 4. SQL Injection
The order lookup uses string concatenation instead of parameterized queries.

### 5. No Input Sanitization
User-supplied data (order details, product names) are directly inserted into PDF without sanitization.

## Installation

**⚠️ WARNING: Only install these packages in isolated testing environments!**

Due to the critical vulnerabilities, npm security frameworks may block installation. To install:

```bash
# This may be blocked by security tools
npm install pdfkit@0.11.0 handlebars@4.5.3

# If blocked, you may need to override security checks (NOT RECOMMENDED for production)
npm install --force pdfkit@0.11.0 handlebars@4.5.3
```

## Usage

Once installed, users can:
1. Navigate to **My Orders** page (`/orders/my-orders`)
2. Click the **🖨️ Print Order** button on any order
3. A PDF will be generated and downloaded

## What Datadog ASM Will Detect

### Software Composition Analysis (SCA)
- ✅ Outdated package versions
- ✅ Known CVEs in dependencies
- ✅ Vulnerable transitive dependencies
- ✅ Severity scores (CVSS)
- ✅ Available patches and remediation steps

### Application Security Monitoring (ASM)
- ✅ IDOR attempts when accessing other users' orders
- ✅ SQL injection in order lookup queries
- ✅ Potential XSS in PDF content
- ✅ Prototype pollution attempts via Handlebars templates

### Interactive Application Security Testing (IAST)
- ✅ Vulnerable method calls (Handlebars.compile, etc.)
- ✅ Untrusted data flow into dangerous sinks
- ✅ Missing input validation
- ✅ Insecure deserialization patterns

## Remediation (For Production Applications)

**DO NOT use these packages in production!** Instead:

1. **Update to secure versions:**
   ```bash
   npm install pdfkit@latest handlebars@latest
   ```

2. **Use alternative libraries:**
   - Use `pdf-lib` or `jsPDF` instead of old PDFKit
   - Use `mustache` or newer Handlebars versions

3. **Add security measures:**
   - Implement authorization checks
   - Use parameterized queries
   - Sanitize all user inputs
   - Validate and escape PDF content

4. **Monitor dependencies:**
   - Use `npm audit` regularly
   - Enable Datadog SCA scanning
   - Set up automated security alerts

## Testing Vulnerabilities

### Test Prototype Pollution (CVE-2021-23369)
Try creating a product with a malicious name:
```javascript
// Malicious product name
"{{#with \"constructor\"}}{{#with \"prototype\"}}{{this.evilProperty}}{{/with}}{{/with}}"
```

### Test IDOR
Access another user's order:
```bash
curl http://localhost:3000/orders/print/1  # Try different order IDs
```

### Test SQL Injection
Manipulate the order ID in the URL:
```bash
curl http://localhost:3000/orders/print/1%20OR%201=1
```

## References

- [CVE-2019-19919 Details](https://nvd.nist.gov/vuln/detail/CVE-2019-19919)
- [CVE-2019-20920 Details](https://nvd.nist.gov/vuln/detail/CVE-2019-20920)
- [CVE-2021-23369 Details](https://nvd.nist.gov/vuln/detail/CVE-2021-23369)
- [Handlebars Security Advisories](https://github.com/handlebars-lang/handlebars.js/security/advisories)
- [Datadog SCA Documentation](https://docs.datadoghq.com/security/application_security/software_composition_analysis/)

---

**Remember:** This is an intentionally vulnerable application for security testing and education. Never deploy this to production or expose it to the public internet!
