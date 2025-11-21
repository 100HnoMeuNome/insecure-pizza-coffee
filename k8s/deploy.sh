#!/bin/bash
# Deployment script for Insecure Pizza & Coffee on Kubernetes

set -e

echo "🍕☕ Deploying Insecure Pizza & Coffee to Kubernetes"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Apply secrets (make sure to update them first!)
echo "🔐 Creating secrets..."
kubectl apply -f secrets.yaml

# Apply ConfigMap
echo "⚙️  Creating ConfigMap..."
kubectl apply -f configmap.yaml

# Deploy MySQL
echo "🗄️  Deploying MySQL..."
kubectl apply -f mysql-deployment.yaml

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
kubectl wait --for=condition=ready pod -l app=mysql -n insecure-pizza-coffee --timeout=300s

# Build Docker image
echo "🐳 Building Docker image..."
cd ..
docker build -t insecure-pizza-coffee:latest .

# Load image into cluster (for local development)
if command -v minikube &> /dev/null && minikube status &> /dev/null; then
    echo "📥 Loading image into Minikube..."
    minikube image load insecure-pizza-coffee:latest
elif command -v kind &> /dev/null; then
    echo "📥 Loading image into Kind..."
    kind load docker-image insecure-pizza-coffee:latest
fi

cd k8s

# Deploy application
echo "🚀 Deploying application..."
kubectl apply -f app-deployment.yaml

# Wait for application to be ready
echo "⏳ Waiting for application to be ready..."
kubectl wait --for=condition=ready pod -l app=pizzacoffee-app -n insecure-pizza-coffee --timeout=300s

# Initialize database
echo "🔧 Initializing database..."
POD_NAME=$(kubectl get pods -n insecure-pizza-coffee -l app=pizzacoffee-app -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n insecure-pizza-coffee $POD_NAME -- npm run init-db

# Get service information
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Service Information:"
kubectl get svc pizzacoffee-service -n insecure-pizza-coffee

echo ""
echo "🔗 Access the application:"
if command -v minikube &> /dev/null && minikube status &> /dev/null; then
    URL=$(minikube service pizzacoffee-service -n insecure-pizza-coffee --url)
    echo "   $URL"
elif kubectl get svc pizzacoffee-service -n insecure-pizza-coffee -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null; then
    IP=$(kubectl get svc pizzacoffee-service -n insecure-pizza-coffee -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    echo "   http://$IP"
else
    echo "   Run: kubectl port-forward -n insecure-pizza-coffee svc/pizzacoffee-service 3000:80"
    echo "   Then visit: http://localhost:3000"
fi

echo ""
echo "👤 Default credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⚠️  Remember: This is an intentionally vulnerable application!"
echo "   Only use in isolated, controlled environments."
