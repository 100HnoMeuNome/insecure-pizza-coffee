# 🚀 Quick Start Guide

Get Insecure Pizza & Coffee running in minutes!

## Option 1: Docker Compose (Recommended)

The fastest way to get started:

```bash
cd insecure-pizza-coffee

# Copy environment file and add your Datadog API key
cp .env.example .env
# Edit .env and set DD_API_KEY

# Start all services
docker-compose up -d

# Initialize database
docker-compose exec app npm run init-db

# View logs
docker-compose logs -f app
```

Visit `http://localhost:3000`

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

## Option 2: Using Makefile

If you have `make` installed:

```bash
cd insecure-pizza-coffee

# View all available commands
make help

# Start services
make up

# Initialize database
make init-db

# View logs
make logs
```

## Option 3: Kubernetes

For Kubernetes deployment:

```bash
cd insecure-pizza-coffee

# Update secrets first
nano k8s/secrets.yaml
# Add your Datadog API key

# Deploy everything
make k8s-deploy

# Or manually:
cd k8s
./deploy.sh
```

## ⚙️ Configuration

### Minimal Setup

Only one required configuration:

1. Set your Datadog API key in `.env`:
   ```env
   DD_API_KEY=your-actual-api-key-here
   ```

### Optional Configuration

Customize other settings in `.env`:

```env
# Application
PORT=3000
SESSION_SECRET=your-secret-here

# Database
DB_HOST=mysql
DB_USER=pizzauser
DB_PASSWORD=pizzapass123

# Datadog
DD_SITE=datadoghq.com
DD_ENV=development
```

## 📊 Verify Datadog Integration

### 1. Check Agent Status

```bash
# Docker Compose
docker-compose exec datadog-agent agent status

# Kubernetes
kubectl exec -n datadog -l app=datadog-agent -- agent status
```

### 2. Verify in Datadog UI

1. **APM**: Go to APM → Services → `insecure-pizza-coffee`
2. **ASM**: Go to Security → Application Security
3. **IAST**: Go to Security → Application Vulnerabilities
4. **SCA**: Go to Security → Software Composition Analysis

## 🧪 Test the Vulnerabilities

### Quick SQL Injection Test

```bash
# Using curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1&password=anything"

# Or use the Makefile
make test-sql-injection
```

### Test IDOR

```bash
# View other users' orders
curl "http://localhost:3000/orders/my-orders?userId=2"

# Or use the Makefile
make test-idor
```

### Access Admin Panel

1. Login as admin (admin/admin123)
2. Navigate to `http://localhost:3000/admin/dashboard`
3. Try command injection in "Execute System Command"
4. Try SQL injection in "Execute SQL Query"

## 🔍 Monitor in Datadog

After generating some traffic:

### View Security Attacks

```
Datadog → Security → Application Security → Traces
```

Look for:
- SQL Injection attempts
- Command Injection
- XSS attacks
- Authentication attacks

### View Code Vulnerabilities

```
Datadog → Security → Application Vulnerabilities
```

You should see:
- SQL Injection vulnerabilities
- Command Injection risks
- Sensitive data exposure
- Weak cryptography

### View Vulnerable Dependencies

```
Datadog → Security → Software Composition Analysis → Services
```

Check for vulnerable npm packages.

## 🛠️ Troubleshooting

### App Won't Start

```bash
# Check logs
docker-compose logs app

# Check database
docker-compose logs mysql

# Restart everything
docker-compose restart
```

### Can't Connect to Database

```bash
# Check MySQL is ready
docker-compose exec mysql mysqladmin ping -h localhost -u root -prootpass123

# Reinitialize
docker-compose exec app npm run init-db
```

### Datadog Not Receiving Data

1. Check API key is correct in `.env`
2. Verify agent is running:
   ```bash
   docker-compose ps datadog-agent
   ```
3. Check agent logs:
   ```bash
   docker-compose logs datadog-agent
   ```
4. Test connectivity:
   ```bash
   docker-compose exec app curl -v https://api.datadoghq.com
   ```

### Port 3000 Already in Use

Change port in `.env`:
```env
PORT=8080
```

And in `docker-compose.yml`:
```yaml
ports:
  - "8080:8080"
```

## 📱 Access Points

Once running:

| Service | URL | Notes |
|---------|-----|-------|
| Application | http://localhost:3000 | Main app |
| MySQL | localhost:3306 | Database |
| Datadog Agent | localhost:8126 | APM |

## 🎯 Next Steps

1. **Browse the Menu**: Navigate to `/orders/menu`
2. **Place an Order**: Add items to cart and checkout
3. **Check Datadog**: View traces in APM
4. **Test Vulnerabilities**: Try SQL injection, XSS, etc.
5. **View Security Signals**: Check ASM for detected attacks
6. **Review IAST Results**: See code-level vulnerabilities

## 📚 More Information

- Full documentation: [README.md](README.md)
- Vulnerability catalog: [SECURITY.md](SECURITY.md)
- API endpoints: See README.md

## ⚠️ Security Warning

**Never expose this application to the internet!**

This is an intentionally vulnerable application for:
- Security testing
- Training
- Datadog feature demonstration
- Educational purposes only

---

**Happy Testing! 🍕☕**
