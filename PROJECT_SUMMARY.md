# 🍕☕ Insecure Pizza & Coffee - Project Summary

## Overview

A comprehensive, intentionally vulnerable Node.js web application integrated with Datadog's complete security suite (APM, ASM, IAST, SCA, and Workload Security).

## 📁 Project Structure

```
insecure-pizza-coffee/
├── 📄 Configuration Files
│   ├── .env                    # Environment configuration (with Datadog API key)
│   ├── .env.example           # Environment template
│   ├── package.json           # Node.js dependencies
│   ├── Dockerfile             # Container image definition
│   ├── docker-compose.yml     # Multi-container orchestration
│   └── Makefile              # Convenient build/run commands
│
├── 📚 Documentation
│   ├── README.md             # Complete documentation
│   ├── QUICKSTART.md         # Quick start guide
│   ├── SECURITY.md           # Vulnerability catalog
│   └── PROJECT_SUMMARY.md    # This file
│
├── 🗄️ Database
│   ├── db/
│   │   ├── schema.sql        # MySQL schema with sample data
│   │   └── init.js           # Database initialization script
│
├── 🖥️ Application Source
│   ├── src/
│   │   ├── server.js         # Main application (Datadog APM integrated)
│   │   │
│   │   ├── config/
│   │   │   └── database.js   # MySQL connection pool
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js       # Authentication (SQL injection vulnerable)
│   │   │   ├── orders.js     # Order management (IDOR vulnerable)
│   │   │   ├── payment.js    # Payment processing (data exposure)
│   │   │   └── admin.js      # Admin panel (command injection)
│   │   │
│   │   ├── views/            # EJS templates (14 files)
│   │   │   ├── header.ejs
│   │   │   ├── footer.ejs
│   │   │   ├── index.ejs
│   │   │   ├── login.ejs
│   │   │   ├── register.ejs
│   │   │   ├── menu.ejs
│   │   │   ├── cart.ejs
│   │   │   ├── checkout.ejs
│   │   │   ├── order-confirmation.ejs
│   │   │   ├── my-orders.ejs
│   │   │   ├── admin-dashboard.ejs
│   │   │   ├── admin-orders.ejs
│   │   │   ├── admin-users.ejs
│   │   │   └── error.ejs
│   │   │
│   │   └── public/           # Static assets
│   │       ├── css/
│   │       │   └── style.css # Complete responsive styles
│   │       └── js/
│   │           └── main.js   # Client-side JavaScript
│
└── ☸️ Kubernetes Deployment
    └── k8s/
        ├── namespace.yaml          # Namespace definition
        ├── configmap.yaml          # Application configuration
        ├── secrets.yaml            # Secrets (API keys, passwords)
        ├── mysql-deployment.yaml   # MySQL StatefulSet + Service
        ├── app-deployment.yaml     # App Deployment + Service + HPA
        ├── datadog-agent.yaml      # Datadog Agent configuration
        └── deploy.sh               # Automated deployment script
```

## 🎯 Key Features

### Application Features
- ✅ User registration and authentication
- ✅ Product catalog (Pizza & Coffee)
- ✅ Shopping cart functionality
- ✅ Order placement and tracking
- ✅ Payment processing (Credit Card & PIX)
- ✅ Admin dashboard with management tools
- ✅ Responsive web design

### Security Testing Features
- ✅ SQL Injection vulnerabilities
- ✅ Command Injection
- ✅ Cross-Site Scripting (XSS)
- ✅ Insecure Direct Object References (IDOR)
- ✅ Sensitive Data Exposure
- ✅ Broken Authentication
- ✅ Missing Authorization
- ✅ Security Misconfiguration
- ✅ Information Disclosure
- ✅ Username Enumeration

### Datadog Integration
- ✅ APM (Application Performance Monitoring)
- ✅ ASM (Application Security Monitoring)
- ✅ IAST (Interactive Application Security Testing)
- ✅ SCA (Software Composition Analysis)
- ✅ Workload Security (Runtime monitoring)
- ✅ Distributed Tracing
- ✅ Custom Span Tags
- ✅ Log Injection
- ✅ Runtime Metrics

## 🐳 Deployment Options

### 1. Docker Compose ⭐ Recommended
```bash
docker-compose up -d
docker-compose exec app npm run init-db
```

**Services:**
- App (Node.js) on port 3000
- MySQL on port 3306
- Datadog Agent with full security suite

### 2. Kubernetes
```bash
cd k8s && ./deploy.sh
```

**Components:**
- Namespace: `insecure-pizza-coffee`
- MySQL StatefulSet with persistent storage
- App Deployment with 2 replicas
- Horizontal Pod Autoscaler
- LoadBalancer Service
- Datadog Agent DaemonSet (separate namespace)

### 3. Local Development
```bash
npm install
npm run dev
```

## 📊 Database Schema

**Tables:**
1. `users` - User accounts
2. `products` - Pizza and coffee items
3. `orders` - Order records
4. `order_items` - Order line items
5. `payment_transactions` - Payment records (with sensitive data)

**Sample Data:**
- 10 products (4 pizzas, 6 coffees)
- 1 admin user (admin/admin123)

## 🔧 Technology Stack

**Backend:**
- Node.js 18+
- Express.js
- MySQL 8.0
- EJS templating
- bcrypt (password hashing)
- express-session

**Datadog:**
- dd-trace (APM)
- @datadog/native-appsec (ASM)
- @datadog/native-iast-rewriter (IAST)

**Frontend:**
- Vanilla JavaScript
- CSS3 (Responsive)
- EJS templates

**DevOps:**
- Docker & Docker Compose
- Kubernetes
- Helm (for Datadog Agent)

## 🎮 Quick Commands

### Using Makefile
```bash
make help          # Show all commands
make up            # Start with Docker Compose
make init-db       # Initialize database
make logs          # View logs
make k8s-deploy    # Deploy to Kubernetes
make dd-check      # Check Datadog Agent status
```

### Docker Compose
```bash
docker-compose up -d           # Start
docker-compose down            # Stop
docker-compose logs -f app     # View logs
docker-compose restart         # Restart
```

### Kubernetes
```bash
kubectl get pods -n insecure-pizza-coffee
kubectl logs -f -n insecure-pizza-coffee -l app=pizzacoffee-app
kubectl port-forward -n insecure-pizza-coffee svc/pizzacoffee-service 3000:80
```

## 🔐 Security Vulnerabilities by OWASP Top 10

1. **A03:2021 – Injection**: SQL Injection throughout
2. **A01:2021 – Broken Access Control**: IDOR vulnerabilities
3. **A03:2021 – Injection**: Command Injection in admin panel
4. **A07:2021 – Identification and Authentication Failures**: Weak session management
5. **A02:2021 – Cryptographic Failures**: Plaintext sensitive data storage
6. **A05:2021 – Security Misconfiguration**: Debug mode, default credentials
7. **A01:2021 – Broken Access Control**: Missing authorization checks
8. **A09:2021 – Security Logging and Monitoring Failures**: Inadequate logging

## 📈 What Datadog Detects

### ASM (Real-time Threats)
- SQL injection attempts
- Command injection attacks
- XSS payloads
- Authentication brute force
- Path traversal attempts

### IAST (Code Vulnerabilities)
- SQL injection sinks
- Command execution risks
- Weak cryptography
- Hard-coded secrets
- Insecure configurations

### SCA (Dependency Issues)
- Known CVEs in npm packages
- Outdated dependencies
- Security advisories

### Workload Security
- Suspicious process execution
- File system modifications
- Network anomalies
- Container escape attempts

## 🧪 Testing Scenarios

### Basic User Flow
1. Register new account
2. Browse menu
3. Add items to cart
4. Checkout and pay
5. View order confirmation

### Security Testing Flow
1. SQL injection on login
2. XSS in order notes
3. IDOR to access other orders
4. Command injection in admin panel
5. View plaintext payment data

## 📚 File Statistics

- **Total Files**: 41
- **JavaScript**: 6 files
- **EJS Templates**: 14 files
- **YAML/Config**: 8 files
- **Documentation**: 4 files
- **SQL**: 1 file
- **CSS**: 1 file

## 🔗 Important URLs

**Local Access:**
- Application: http://localhost:3000
- Admin Panel: http://localhost:3000/admin/dashboard
- Menu: http://localhost:3000/orders/menu

**Datadog (datadoghq.com):**
- APM: `/apm/services`
- ASM: `/security/appsec`
- IAST: `/security/appsec/vulnerabilities`
- SCA: `/security/appsec/inventory`
- Workload Security: `/security/cspm`

## 🎓 Learning Outcomes

Using this application, you can learn:
- How SQL injection works and how ASM detects it
- Real-time threat detection with Datadog ASM
- Code-level vulnerability scanning with IAST
- Dependency vulnerability tracking with SCA
- Container runtime protection
- How to integrate Datadog security features
- OWASP Top 10 vulnerabilities in practice

## ⚠️ Important Notes

1. **Never deploy to production** - This is intentionally vulnerable
2. **Use in isolated environments only** - Private networks, VMs, or containers
3. **Not for public access** - Will be immediately compromised
4. **Educational purposes only** - Security testing and training
5. **Datadog API key required** - Get from your Datadog account

## 🤝 Support & Resources

- **GitHub Issues**: Report problems or suggestions
- **Datadog Docs**: https://docs.datadoghq.com/security/
- **OWASP**: https://owasp.org/www-project-top-ten/

## 📝 License

MIT License - Educational and testing use only

---

**Created with ❤️ for Security Testing and Datadog Feature Demonstration**

*Last Updated: 2025-11-19*
