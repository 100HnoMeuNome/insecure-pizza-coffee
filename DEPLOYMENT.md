# Kubernetes Deployment Guide

This guide works for both **AWS EKS** and **Azure AKS**.

## Prerequisites

- kubectl configured for your cluster
- Docker installed locally
- Access to a container registry (ECR for AWS, ACR for Azure)

## Quick Deploy

### 1. Build and Push Docker Image

**For AWS EKS with ECR:**
```bash
# Login to ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

# Build and tag
docker build -t insecure-pizza-coffee:latest .
docker tag insecure-pizza-coffee:latest <account-id>.dkr.ecr.<region>.amazonaws.com/insecure-pizza-coffee:latest

# Push to ECR
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/insecure-pizza-coffee:latest
```

**For Azure AKS with ACR:**
```bash
# Login to ACR
az acr login --name <registry-name>

# Build and tag
docker build -t insecure-pizza-coffee:latest .
docker tag insecure-pizza-coffee:latest <registry-name>.azurecr.io/insecure-pizza-coffee:latest

# Push to ACR
docker push <registry-name>.azurecr.io/insecure-pizza-coffee:latest
```

### 2. Update Image Reference

Edit `k8s/all-in-one.yaml` and replace `YOUR_REGISTRY/insecure-pizza-coffee:latest` with your actual image:

**For EKS:**
```yaml
image: <account-id>.dkr.ecr.<region>.amazonaws.com/insecure-pizza-coffee:latest
```

**For AKS:**
```yaml
image: <registry-name>.azurecr.io/insecure-pizza-coffee:latest
```

### 3. Update Secrets (Optional but Recommended)

Edit the secrets in `k8s/all-in-one.yaml`:
```yaml
stringData:
  SESSION_SECRET: "your-random-secret-here"
  DB_USER: "pizzauser"
  DB_PASSWORD: "your-secure-password"
  DD_API_KEY: "your-datadog-api-key"
```

### 4. Deploy Everything

```bash
kubectl apply -f k8s/all-in-one.yaml
```

### 5. Wait for Deployment

```bash
# Watch all pods come up
kubectl get pods -n insecure-pizza-coffee -w

# Or wait for specific readiness
kubectl wait --for=condition=ready pod -l app=mysql -n insecure-pizza-coffee --timeout=300s
kubectl wait --for=condition=ready pod -l app=pizzacoffee-app -n insecure-pizza-coffee --timeout=300s
```

### 6. Get Service URL

```bash
kubectl get svc pizzacoffee-service -n insecure-pizza-coffee
```

Wait for the LoadBalancer to assign an external IP/hostname:
- **EKS**: You'll get an AWS ELB hostname
- **AKS**: You'll get an Azure public IP

## Alternative: Using Separate Files

If you prefer individual files instead of the all-in-one manifest:

```bash
# Deploy in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mysql-deployment.yaml

# Wait for MySQL
kubectl wait --for=condition=ready pod -l app=mysql -n insecure-pizza-coffee --timeout=300s

# Deploy application
kubectl apply -f k8s/app-deployment.yaml
```

## Verify Deployment

```bash
# Check all resources
kubectl get all -n insecure-pizza-coffee

# Check logs
kubectl logs -l app=pizzacoffee-app -n insecure-pizza-coffee --tail=50

# Test health endpoint
curl http://<EXTERNAL-IP>/health
```

## Cleanup

```bash
kubectl delete -f k8s/all-in-one.yaml
```

Or:
```bash
kubectl delete namespace insecure-pizza-coffee
```

## Notes

- The PersistentVolumeClaim will use the default storage class in your cluster (gp2/gp3 for EKS, Azure Disk for AKS)
- LoadBalancer service will automatically provision cloud load balancers
- HPA requires metrics-server to be installed in your cluster (usually pre-installed in EKS/AKS)
