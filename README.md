# 🍕☕ Insecure Pizza & Coffee

**An Intentionally Vulnerable Application for Security Testing**

This is a deliberately insecure Node.js web application designed for security testing, training, and demonstration purposes. It integrates with Datadog's complete security suite including APM, ASM (Application Security Monitoring), IAST (Interactive Application Security Testing), SCA (Software Composition Analysis), and Workload Security.

## ⚠️ WARNING

**DO NOT deploy this application to production or expose it to the public internet!**

This application contains numerous intentional security vulnerabilities and should only be used in controlled, isolated environments for:
- Security testing and training
- Datadog security features demonstration
- Educational purposes
- Vulnerability assessment practice

## 📋 Features

- **User Authentication**: Login and registration system (with vulnerabilities)
- **Product Catalog**: Browse pizzas and Brazilian specialty coffees
  - Pizzas: Margherita, Pepperoni, Quattro Formaggi, Vegetarian
  - Coffees: Espresso, Cappuccino, Americano, Cold Brew
  - **Brazilian Specialties**: Café Bala de Caramelo, Café Garapa, Jacu Bird Coffee
- **Shopping Cart**: Add items and manage orders
- **Order Management**: Place orders and track delivery
- **Payment Processing**: Credit card and PIX payment methods
- **Admin Panel**: Administrative dashboard with dangerous operations
- **Print Orders**: PDF generation using vulnerable libraries

## 🐛 Intentional Vulnerabilities

This application includes the following security vulnerabilities for testing:

1. **SQL Injection** - Unparameterized queries throughout the application
2. **Cross-Site Scripting (XSS)** - No input sanitization
3. **Insecure Direct Object References (IDOR)** - Access control issues
4. **Command Injection** - Admin panel allows arbitrary command execution
5. **Sensitive Data Exposure** - Credit card data stored in plaintext
6. **Broken Authentication** - Weak session management and insecure JWT implementation
7. **Security Misconfiguration** - Insecure defaults
8. **Information Disclosure** - Verbose error messages
9. **Missing Authorization** - Inadequate access controls
10. **Insecure Deserialization** - Unsafe object handling
11. **Hardcoded Secrets** - JWT secret hardcoded as 'pizza123'
12. **Vulnerable Dependencies** - Outdated packages with known CVEs

## 🛡️ Datadog Security Integration

### Features Enabled

- **APM (Application Performance Monitoring)**: Full distributed tracing
- **ASM (Application Security Monitoring)**: Real-time threat detection and protection
- **IAST (Interactive Application Security Testing)**: Runtime vulnerability detection
- **SCA (Software Composition Analysis)**: Dependency vulnerability scanning
- **Workload Security**: Runtime security monitoring for containers and hosts

**📖 For detailed ASM setup instructions, see [ASM-SETUP.md](./ASM-SETUP.md)**

### What Datadog Will Detect

- SQL injection attempts
- XSS attacks
- Command injection
- Path traversal attempts
- Authentication attacks
- Sensitive data exposure
- Suspicious system calls
- Container runtime threats
- Vulnerable dependencies

### ASM Configuration Options

The application supports the following ASM environment variables:

- `DD_APPSEC_ENABLED=true` - Enable Application Security Monitoring
- `DD_IAST_ENABLED=true` - Enable Interactive Application Security Testing
- `DD_APPSEC_SCA_ENABLED=true` - Enable Software Composition Analysis
- `DD_REMOTE_CONFIGURATION_ENABLED=true` - Enable remote configuration and blocking

All features use Datadog's optimized default settings. For advanced configuration options, see the [Datadog ASM documentation](https://docs.datadoghq.com/security/application_security/).

## 📦 Prerequisites

- Node.js 18+
- MySQL 8.0+
- Docker & Docker Compose (for containerized deployment)
- Kubernetes cluster (for K8s deployment)
- Datadog account with API key

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd insecure-pizza-coffee
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file and add your Datadog API key:

```env
DD_API_KEY=your-datadog-api-key-here
DD_SITE=datadoghq.com
```

### 2.5. Verify ASM Configuration (Optional)

Test that Datadog ASM is properly configured:

```bash
npm install
npm run test-asm
```

This will verify all ASM, IAST, and SCA settings are correct.

### 3. Run with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Initialize the database
docker-compose exec app npm run init-db

# View logs
docker-compose logs -f app
```

The application will be available at `http://localhost:3000`

### 4. Default Credentials

```
Username: admin
Password: admin123
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t insecure-pizza-coffee:latest .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# Stop all services (with automatic user cleanup)
./docker-down.sh

# Stop and remove all volumes (delete all data)
./docker-down.sh -v

# Stop without user cleanup
./docker-down.sh --skip-cleanup

# Or use docker-compose directly (no automatic cleanup)
docker-compose down
```

### Clean Up Test Users

During testing, you may create many user accounts. Clean them up while keeping the default admin and user accounts:

```bash
# Clean up all users except 'admin' and 'user'
npm run cleanup-users

# Or run the shell script directly
./scripts/cleanup-users.sh

# Or use SQL directly
docker-compose exec mysql mysql -u pizzauser -p pizzacoffee < db/cleanup-users.sql
```

**Note:** The cleanup also removes orders, order items, and payments associated with deleted users. See [USER-CLEANUP.md](./USER-CLEANUP.md) for complete documentation.

## ☸️ Kubernetes Deployment

### Prerequisites

1. Kubernetes cluster running
2. kubectl configured
3. Datadog Helm repository added

### Deploy the Application

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (update with your values first)
kubectl apply -f k8s/secrets.yaml

# Create ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy MySQL
kubectl apply -f k8s/mysql-deployment.yaml

# Wait for MySQL to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n insecure-pizza-coffee --timeout=300s

# Build and load Docker image (for local clusters)
docker build -t insecure-pizza-coffee:latest .
# For Minikube: minikube image load insecure-pizza-coffee:latest
# For Kind: kind load docker-image insecure-pizza-coffee:latest

# Deploy application
kubectl apply -f k8s/app-deployment.yaml

# Get service URL
kubectl get svc pizzacoffee-service -n insecure-pizza-coffee
```

### Deploy Datadog Agent

```bash
# Add Datadog Helm repo
helm repo add datadog https://helm.datadoghq.com
helm repo update

# Create Datadog namespace
kubectl create namespace datadog

# Create secret with API key
kubectl create secret generic datadog-secret \
  --from-literal api-key=YOUR_DD_API_KEY \
  -n datadog

# Install Datadog Agent with ASM and Runtime Security
helm install datadog-agent datadog/datadog \
  --namespace datadog \
  --set datadog.apiKey=YOUR_DD_API_KEY \
  --set datadog.site=datadoghq.com \
  --set datadog.apm.portEnabled=true \
  --set datadog.logs.enabled=true \
  --set datadog.logs.containerCollectAll=true \
  --set datadog.processAgent.enabled=true \
  --set datadog.securityAgent.runtime.enabled=true \
  --set datadog.securityAgent.compliance.enabled=true \
  --set clusterAgent.enabled=true \
  --set clusterAgent.admissionController.enabled=true
```

### Initialize Database in Kubernetes

```bash
# Get pod name
POD_NAME=$(kubectl get pods -n insecure-pizza-coffee -l app=pizzacoffee-app -o jsonpath='{.items[0].metadata.name}')

# Initialize database
kubectl exec -n insecure-pizza-coffee $POD_NAME -- npm run init-db
```

### Update Menu (If Database Already Exists)

If you already have the database initialized and want to update the coffee menu:

```bash
# Update menu with new Brazilian coffee varieties
npm run update-menu

# This will:
# - Remove Mocha and Latte
# - Add Café Bala de Caramelo, Café Garapa, and Jacu Bird Coffee
# - Update all product images to use external URLs
```

## 🔧 Local Development

### Install Dependencies

```bash
npm install
```

### Setup Database

```bash
# Start MySQL locally or use Docker
docker run -d --name mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass123 \
  -e MYSQL_DATABASE=pizzacoffee \
  -e MYSQL_USER=pizzauser \
  -e MYSQL_PASSWORD=pizzapass123 \
  -p 3306:3306 \
  mysql:8.0

# Initialize database
npm run init-db
```

### Run Application

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## 📊 Monitoring in Datadog

### View APM Traces

1. Navigate to **APM > Traces** in Datadog
2. Filter by service: `insecure-pizza-coffee`
3. View request traces, latency, and errors

### View Security Signals

1. Navigate to **Security > Application Security**
2. View detected attacks and vulnerabilities
3. Examine threat intelligence and attack patterns

### View IAST Vulnerabilities

1. Navigate to **Security > Application Vulnerabilities**
2. View detected code-level vulnerabilities
3. Review remediation guidance

### View SCA Results

1. Navigate to **Security > Software Composition Analysis**
2. View vulnerable dependencies
3. Check for available patches

**Note:** The Print Order feature uses intentionally outdated packages (`pdfkit@0.11.0` and `handlebars@4.5.3`) with known CVEs. See [VULNERABLE-PACKAGES.md](./VULNERABLE-PACKAGES.md) for details.

### View Runtime Security

1. Navigate to **Security > Cloud Workload Security**
2. View runtime threats and anomalies
3. Monitor container and process activity

## 🧪 Testing Vulnerabilities

### SQL Injection

```bash
# Login with SQL injection
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1&password=anything"

# Search with SQL injection
curl "http://localhost:3000/orders/menu?category=pizza' OR '1'='1"
```

### Command Injection (Admin Panel)

1. Login as admin
2. Navigate to Admin Dashboard
3. Execute system commands like `ls -la`, `cat /etc/passwd`

### IDOR (Insecure Direct Object Reference)

```bash
# Access other users' orders
curl "http://localhost:3000/orders/my-orders?userId=2"

# View any order
curl "http://localhost:3000/orders/confirmation/1"
```

### Sensitive Data Exposure

Check the database or API responses for plaintext credit card numbers and CVV codes.

### Vulnerable Dependencies (SCA Testing)

The Print Order feature uses outdated libraries with known CVEs:

```bash
# First, install the vulnerable packages (may be blocked by security tools)
npm install pdfkit@0.11.0 handlebars@4.5.3

# Navigate to My Orders and click "Print Order" button
# This will trigger SCA detection in Datadog

# Test IDOR vulnerability in print endpoint
curl "http://localhost:3000/orders/print/1"  # Try different order IDs
```

See [VULNERABLE-PACKAGES.md](./VULNERABLE-PACKAGES.md) for complete documentation on the vulnerable packages and CVEs.

### JWT Authentication Vulnerabilities

Test the insecure JWT implementation:

```bash
# Get JWT token via API
curl -X POST http://localhost:3000/auth/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use JWT in Authorization header
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/orders/menu

# JWT in query string (gets logged!)
curl "http://localhost:3000/orders/menu?token=YOUR_TOKEN_HERE"

# Decode JWT to see password hash
echo "PAYLOAD_PART" | base64 -d
```

**JWT Vulnerabilities:**
- Hardcoded secret: `pizza123`
- Password hash in JWT payload
- Non-httpOnly cookies (accessible via JavaScript)
- No token blacklist/revocation
- Algorithm confusion vulnerability
- Token accepted from multiple sources (URL, cookie, header, body)

See [JWT-VULNERABILITIES.md](./JWT-VULNERABILITIES.md) for complete JWT security documentation.

## 📁 Project Structure

```
insecure-pizza-coffee/
├── src/
│   ├── routes/          # API route handlers
│   │   ├── auth.js      # Authentication routes
│   │   ├── orders.js    # Order management
│   │   ├── payment.js   # Payment processing
│   │   └── admin.js     # Admin panel
│   ├── config/          # Configuration files
│   │   └── database.js  # Database connection
│   ├── views/           # EJS templates
│   ├── public/          # Static files
│   │   ├── css/         # Stylesheets
│   │   └── js/          # Client-side JavaScript
│   └── server.js        # Main application file
├── db/
│   ├── schema.sql       # Database schema
│   └── init.js          # Database initialization
├── k8s/                 # Kubernetes manifests
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile          # Docker image definition
└── package.json        # Node.js dependencies
```

## 🔍 API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Login handler
- `GET /auth/register` - Registration page
- `POST /auth/register` - Registration handler
- `GET /auth/logout` - Logout

### Orders
- `GET /orders/menu` - Product catalog
- `POST /orders/cart/add` - Add to cart
- `POST /orders/cart/remove` - Remove from cart
- `GET /orders/cart` - View cart
- `GET /orders/checkout` - Checkout page
- `POST /orders/place` - Place order
- `GET /orders/confirmation/:orderId` - Order confirmation
- `GET /orders/my-orders` - User's orders

### Payment
- `POST /payment/process` - Process payment
- `POST /payment/pix/generate` - Generate PIX code
- `GET /payment/pix/status/:orderId` - Check PIX status
- `GET /payment/history` - Payment history

### Admin
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/orders` - Manage orders
- `POST /admin/orders/update` - Update order status
- `GET /admin/users` - View users
- `POST /admin/system/execute` - Execute system command
- `POST /admin/database/query` - Execute SQL query
- `GET /admin/export` - Export data

## 🛠️ Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose logs app

# Verify database connection
docker-compose exec mysql mysql -u pizzauser -ppizzapass123 pizzacoffee
```

### Database Issues

```bash
# Reinitialize database
docker-compose exec app npm run init-db

# Reset database
docker-compose down -v
docker-compose up -d
```

### Datadog Not Receiving Data

1. Verify DD_API_KEY is set correctly
2. Check Datadog Agent is running: `docker-compose ps datadog-agent`
3. View agent logs: `docker-compose logs datadog-agent`
4. Verify connectivity: `docker-compose exec datadog-agent agent status`

## 📚 Learning Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Datadog ASM Documentation](https://docs.datadoghq.com/security/application_security/)
- [Datadog IAST Documentation](https://docs.datadoghq.com/security/application_security/iast/)
- [SQL Injection Guide](https://owasp.org/www-community/attacks/SQL_Injection)

## 🤝 Contributing

This is an educational project. Feel free to:
- Add more vulnerabilities
- Improve documentation
- Add test cases
- Enhance Datadog integration

## 📄 License

MIT License - Use for educational and testing purposes only.

## ⚠️ Disclaimer

This application is intentionally vulnerable and should never be deployed in a production environment or exposed to the public internet. The maintainers are not responsible for any misuse of this application.

---

**Happy (Insecure) Testing! 🔐**
