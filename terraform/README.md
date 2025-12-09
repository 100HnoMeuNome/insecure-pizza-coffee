# Terraform EKS Deployment - Insecure Pizza Coffee

## ⚠️ WARNING: INTENTIONALLY INSECURE CONFIGURATION

This Terraform configuration deploys an **intentionally insecure** EKS cluster and application for security testing, monitoring, and training purposes with Datadog.

**DO NOT USE IN PRODUCTION ENVIRONMENTS**

## Security Issues (By Design)

### Infrastructure Level
- ✅ Public EKS API endpoint (accessible from internet)
- ✅ Security groups allow all traffic (0.0.0.0/0)
- ✅ No VPC flow logs
- ✅ Unencrypted EBS volumes
- ✅ IMDSv1 enabled (metadata service v1)
- ✅ SSH access to worker nodes with saved private key
- ✅ Overly permissive IAM roles (AdministratorAccess)
- ✅ No KMS key rotation
- ✅ No EKS cluster logging

### Kubernetes Level
- ✅ Privileged containers
- ✅ Containers running as root (UID 0)
- ✅ No pod security policies
- ✅ No resource limits
- ✅ Network policy allows all traffic
- ✅ Secrets stored as plain Kubernetes secrets
- ✅ No image scanning
- ✅ Public LoadBalancer exposure

### Application Level
- ✅ Hardcoded credentials
- ✅ SQL injection vulnerabilities
- ✅ XSS vulnerabilities
- ✅ IDOR vulnerabilities
- ✅ Weak session management
- ✅ No input validation
- ✅ Cryptomining simulation

## Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip
unzip terraform_1.6.6_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region

# Verify credentials
aws sts get-caller-identity
```

### Datadog API Key
Get your Datadog API key from: https://app.datadoghq.com/organization-settings/api-keys

## Deployment Steps

### 1. Clone Repository and Navigate
```bash
cd /path/to/insecure-pizza-coffee/terraform
```

### 2. Create terraform.tfvars
```bash
cat > terraform.tfvars <<EOF
aws_region      = "us-east-1"
cluster_name    = "insecure-pizza-coffee-eks"
cluster_version = "1.28"
environment     = "dev"

# Datadog Configuration
datadog_api_key = "your-datadog-api-key-here"
datadog_site    = "datadoghq.com"

# Node Configuration
node_instance_type = "t3.medium"
desired_nodes      = 2
min_nodes          = 1
max_nodes          = 4

# Security (intentionally insecure)
enable_public_access = true
EOF
```

### 3. Initialize Terraform
```bash
terraform init
```

### 4. Review Plan
```bash
terraform plan
```

### 5. Deploy Infrastructure
```bash
terraform apply
```

This will take approximately 15-20 minutes to:
- Create VPC and networking
- Deploy EKS cluster
- Create worker nodes
- Install Datadog agent
- Deploy application

### 6. Configure kubectl
```bash
# Get the command from Terraform output
terraform output configure_kubectl

# Or run directly:
aws eks update-kubeconfig --region us-east-1 --name insecure-pizza-coffee-eks
```

### 7. Verify Deployment
```bash
# Check nodes
kubectl get nodes

# Check pods
kubectl get pods -n insecure-pizza-coffee

# Check services
kubectl get svc -n insecure-pizza-coffee

# Get LoadBalancer URL (wait for EXTERNAL-IP)
kubectl get svc pizza-coffee-service -n insecure-pizza-coffee
```

### 8. Build and Push Docker Image

First, create an ECR repository and push your image:

```bash
# Create ECR repository
aws ecr create-repository --repository-name insecure-pizza-coffee --region us-east-1

# Get ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build image
cd ..  # Back to project root
docker build -t insecure-pizza-coffee:latest . \
  --build-arg DD_GIT_REPOSITORY_URL=$(git config --get remote.origin.url) \
  --build-arg DD_GIT_COMMIT_SHA=$(git rev-parse HEAD)

# Tag image
docker tag insecure-pizza-coffee:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/insecure-pizza-coffee:latest

# Push image
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/insecure-pizza-coffee:latest

# Update k8s-manifests.tf with your ECR URL
# Then re-apply:
cd terraform
terraform apply
```

## Access Application

```bash
# Get LoadBalancer URL
export APP_URL=$(kubectl get svc pizza-coffee-service -n insecure-pizza-coffee -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Application URL: http://$APP_URL"

# Open in browser
open "http://$APP_URL"
```

## Monitoring with Datadog

### View in Datadog Dashboard

1. **Infrastructure**
   - Navigate to Infrastructure → Kubernetes
   - See cluster, nodes, and pods

2. **APM (Application Performance Monitoring)**
   - Navigate to APM → Services
   - View traces and performance metrics

3. **Security - Cloud Workload Security**
   - Navigate to Security → Cloud Security Management → Workload Security
   - View runtime threats and compliance findings

4. **Security - Application Security**
   - Navigate to Security → Application Security → Signals
   - View vulnerability detections and attacks

### Expected Detections

Within 10-15 minutes you should see:
- Cryptomining connection attempts
- Privileged container detections
- Root user executions
- Vulnerable dependencies (SCA)
- Application vulnerabilities (IAST)
- Network policy violations
- Compliance violations

## Testing Security Features

### Trigger Cryptomining Detection
```bash
# Exec into app pod
POD_NAME=$(kubectl get pods -n insecure-pizza-coffee -l app=pizza-coffee -o jsonpath='{.items[0].metadata.name}')

kubectl exec -it $POD_NAME -n insecure-pizza-coffee -- /app/mining-connection.sh
```

### Test Application Vulnerabilities
```bash
# SQL Injection
curl "http://$APP_URL/api/search?q=pizza' OR '1'='1"

# Check mining logs
kubectl exec -it $POD_NAME -n insecure-pizza-coffee -- cat /var/log/mining-connections.log
```

### View Datadog Agent Status
```bash
# Get Datadog agent pod
DD_POD=$(kubectl get pods -n insecure-pizza-coffee -l app=datadog -o jsonpath='{.items[0].metadata.name}')

# Check agent status
kubectl exec -it $DD_POD -n insecure-pizza-coffee -- agent status
```

## Cost Estimation

Estimated AWS costs (us-east-1):
- EKS Cluster: ~$73/month
- EC2 Instances (2x t3.medium): ~$60/month
- NAT Gateways (2x): ~$65/month
- EBS Volumes: ~$5/month
- LoadBalancer: ~$20/month

**Total: ~$223/month**

To minimize costs:
- Use smaller instance types (t3.small)
- Reduce to 1 NAT Gateway
- Stop when not in use

## Cleanup

⚠️ **IMPORTANT**: Destroy all resources to avoid ongoing charges

```bash
# Delete Kubernetes resources first
kubectl delete namespace insecure-pizza-coffee

# Wait for LoadBalancer to be deleted (important!)
sleep 60

# Destroy Terraform infrastructure
terraform destroy

# Confirm: type 'yes'
```

### Manual Cleanup (if needed)
```bash
# Delete any remaining LoadBalancers
aws elb describe-load-balancers --region us-east-1
aws elbv2 describe-load-balancers --region us-east-1

# Delete ECR repository
aws ecr delete-repository --repository-name insecure-pizza-coffee --region us-east-1 --force
```

## Troubleshooting

### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n insecure-pizza-coffee

# Describe pod
kubectl describe pod <pod-name> -n insecure-pizza-coffee

# Check logs
kubectl logs <pod-name> -n insecure-pizza-coffee
```

### EKS Cluster Issues
```bash
# Check cluster status
aws eks describe-cluster --name insecure-pizza-coffee-eks --region us-east-1

# Check node group
aws eks describe-nodegroup --cluster-name insecure-pizza-coffee-eks --nodegroup-name insecure-pizza-coffee-eks-nodes --region us-east-1
```

### Datadog Not Reporting
```bash
# Check Datadog agent logs
kubectl logs -l app=datadog -n insecure-pizza-coffee --tail=100

# Verify API key
kubectl get secret datadog-secret -n insecure-pizza-coffee -o jsonpath='{.data.api-key}' | base64 -d
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Region                           │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                     VPC (10.0.0.0/16)                   │ │
│  │                                                          │ │
│  │  ┌──────────────────┐        ┌──────────────────┐     │ │
│  │  │  Public Subnet   │        │  Public Subnet   │     │ │
│  │  │  10.0.0.0/24     │        │  10.0.1.0/24     │     │ │
│  │  │                  │        │                  │     │ │
│  │  │  ┌────────────┐  │        │  ┌────────────┐  │     │ │
│  │  │  │NAT Gateway │  │        │  │NAT Gateway │  │     │ │
│  │  │  └────────────┘  │        │  └────────────┘  │     │ │
│  │  └──────────────────┘        └──────────────────┘     │ │
│  │                                                          │ │
│  │  ┌──────────────────┐        ┌──────────────────┐     │ │
│  │  │  Private Subnet  │        │  Private Subnet  │     │ │
│  │  │  10.0.10.0/24    │        │  10.0.11.0/24    │     │ │
│  │  │                  │        │                  │     │ │
│  │  │  ┌────────────┐  │        │  ┌────────────┐  │     │ │
│  │  │  │ EKS Node   │  │        │  │ EKS Node   │  │     │ │
│  │  │  │ t3.medium  │  │        │  │ t3.medium  │  │     │ │
│  │  │  │            │  │        │  │            │  │     │ │
│  │  │  │ ┌────────┐ │  │        │  │ ┌────────┐ │  │     │ │
│  │  │  │ │  Pods  │ │  │        │  │ │  Pods  │ │  │     │ │
│  │  │  │ │  App   │ │  │        │  │ │  App   │ │  │     │ │
│  │  │  │ │  MySQL │ │  │        │  │ │Datadog │ │  │     │ │
│  │  │  │ └────────┘ │  │        │  │ └────────┘ │  │     │ │
│  │  │  └────────────┘  │        │  └────────────┘  │     │ │
│  │  └──────────────────┘        └──────────────────┘     │ │
│  │                                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  EKS Control Plane (Managed by AWS)                    │ │
│  │  - Public API Endpoint (0.0.0.0/0)                     │ │
│  │  - OIDC Provider                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  LoadBalancer                                           │ │
│  │  - Public facing                                        │ │
│  │  - Routes to App Service                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                            │
                            ▼
                    ┌───────────────┐
                    │    Internet   │
                    │    Users      │
                    └───────────────┘
```

## Files Structure

```
terraform/
├── main.tf              # Main configuration and providers
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── vpc.tf              # VPC, subnets, security groups (insecure)
├── eks.tf              # EKS cluster, nodes, IAM (insecure)
├── kubernetes.tf       # Kubernetes provider, Datadog agent
├── k8s-manifests.tf    # Application deployments (insecure)
├── terraform.tfvars    # Your variable values (create this)
├── eks-nodes-key.pem   # SSH key (generated, insecure)
└── README.md           # This file
```

## Security Testing Checklist

Use this deployment to test detection of:

- [ ] Privileged containers
- [ ] Root user execution
- [ ] Public LoadBalancer
- [ ] Weak network policies
- [ ] Unencrypted volumes
- [ ] IMDSv1 usage
- [ ] Overpermissive IAM roles
- [ ] Cryptomining activity
- [ ] SQL injection
- [ ] XSS attacks
- [ ] IDOR vulnerabilities
- [ ] Hardcoded secrets
- [ ] Vulnerable dependencies

## Additional Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Datadog Kubernetes Integration](https://docs.datadoghq.com/containers/kubernetes/)
- [Datadog Cloud Workload Security](https://docs.datadoghq.com/security/cloud_workload_security/)
- [EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)

## Support

For issues with this deployment, check:
1. AWS CLI configuration and credentials
2. Terraform version compatibility
3. AWS service quotas and limits
4. Datadog API key validity
5. ECR image availability

## Legal Notice

This infrastructure is for **authorized security testing only**. Ensure you have:
- Proper authorization
- Budget approval for AWS costs
- Understanding this is intentionally insecure
- Plan to destroy resources after testing

---

**Remember**: This is an intentionally insecure deployment. Always destroy after testing to avoid costs and security risks.
