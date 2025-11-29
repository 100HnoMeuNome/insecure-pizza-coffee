# Terraform EKS Deployment Summary

## Overview

Complete Terraform Infrastructure-as-Code to deploy the Insecure Pizza Coffee application on AWS EKS with **intentionally weak security** for Datadog monitoring and security testing.

## What's Included

### Infrastructure Components

1. **VPC & Networking**
   - VPC with public and private subnets across 2 AZs
   - Internet Gateway for outbound traffic
   - NAT Gateways for private subnet internet access
   - Route tables for public and private subnets
   - INSECURE security groups (allow all traffic)

2. **EKS Cluster**
   - Kubernetes 1.28 cluster
   - Public API endpoint (0.0.0.0/0 access)
   - Worker nodes in private subnets
   - t3.medium instances (configurable)
   - Auto-scaling group (1-4 nodes)
   - SSH access with generated key pair
   - OIDC provider for service accounts

3. **Kubernetes Resources**
   - Namespace: `insecure-pizza-coffee`
   - MySQL StatefulSet
   - Application Deployment (2 replicas)
   - Services (MySQL internal, App LoadBalancer)
   - ConfigMaps and Secrets
   - Network policy (allow all)
   - Datadog Agent DaemonSet (via Helm)

4. **IAM & Security**
   - Cluster IAM role with AdminAccess (INSECURE)
   - Node IAM role with excessive permissions
   - KMS key for encryption (weak config)
   - SSH key pair for node access

## File Structure

```
terraform/
├── main.tf                    # Providers and data sources
├── variables.tf               # Input variables definitions
├── outputs.tf                 # Output values
├── vpc.tf                     # VPC, subnets, security groups
├── eks.tf                     # EKS cluster, nodes, IAM roles
├── kubernetes.tf              # K8s provider, Datadog Helm chart
├── k8s-manifests.tf          # App and MySQL deployments
├── terraform.tfvars.example   # Example variables file
├── .gitignore                # Git ignore patterns
└── README.md                 # Detailed deployment guide
```

## Quick Start

### 1. Prerequisites
```bash
# Install tools
brew install terraform awscli kubectl helm  # macOS
# OR
apt install terraform awscli kubectl        # Linux

# Configure AWS
aws configure
```

### 2. Prepare Configuration
```bash
cd terraform/

# Copy example and edit
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars  # Add your Datadog API key
```

### 3. Deploy
```bash
# Initialize
terraform init

# Review plan
terraform plan

# Deploy (15-20 minutes)
terraform apply
```

### 4. Access Cluster
```bash
# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name insecure-pizza-coffee-eks

# Verify
kubectl get nodes
kubectl get pods -n insecure-pizza-coffee
```

### 5. Get Application URL
```bash
kubectl get svc pizza-coffee-service -n insecure-pizza-coffee
# Wait for EXTERNAL-IP, then access: http://<EXTERNAL-IP>
```

## Intentional Security Issues

### Infrastructure (27 Issues)

| Category | Issue | Severity |
|----------|-------|----------|
| Network | Public EKS API (0.0.0.0/0) | CRITICAL |
| Network | Security groups allow all traffic | CRITICAL |
| Network | Public IPs auto-assigned | HIGH |
| IAM | AdministratorAccess policy attached | CRITICAL |
| IAM | Overly permissive node IAM roles | HIGH |
| Compute | IMDSv1 enabled | HIGH |
| Compute | Unencrypted EBS volumes | HIGH |
| Compute | SSH keys generated and saved locally | HIGH |
| Encryption | Weak KMS configuration | MEDIUM |
| Logging | No EKS cluster logs | MEDIUM |
| Logging | No VPC flow logs | MEDIUM |

### Kubernetes (15 Issues)

| Category | Issue | Severity |
|----------|-------|----------|
| Pods | Privileged containers | CRITICAL |
| Pods | Running as root (UID 0) | CRITICAL |
| Pods | Allow privilege escalation | HIGH |
| Pods | No resource limits | MEDIUM |
| Pods | Read-write root filesystem | MEDIUM |
| Network | Network policy allows all | HIGH |
| Network | Public LoadBalancer | MEDIUM |
| Secrets | Plain Kubernetes secrets | HIGH |
| Security | No pod security standards | HIGH |
| Security | No image scanning | MEDIUM |

### Application (12 Issues)

| Category | Issue | Severity |
|----------|-------|----------|
| Code | SQL injection vulnerabilities | CRITICAL |
| Code | XSS vulnerabilities | HIGH |
| Code | IDOR vulnerabilities | HIGH |
| Code | Hardcoded credentials | HIGH |
| Code | Weak session management | HIGH |
| Code | Cookie-session (client-side) | HIGH |
| Runtime | Cryptomining simulation | CRITICAL |
| Dependencies | Vulnerable npm packages | HIGH |

**Total: 54 Intentional Security Issues**

## Cost Breakdown

### Monthly AWS Costs (us-east-1)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| EKS Cluster | 1 cluster | $73 |
| EC2 Instances | 2x t3.medium | $60 |
| NAT Gateway | 2x gateways | $65 |
| EBS Volumes | 100GB | $10 |
| LoadBalancer | 1x ALB | $20 |
| Data Transfer | ~100GB | $10 |
| **TOTAL** | | **~$238/month** |

### Cost Optimization

Reduce to ~$120/month:
- Use t3.small instances: -$30
- Single NAT Gateway: -$32
- Single AZ: -$33

**Always destroy when not in use!**

## Deployment Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| VPC Creation | 2-3 min | VPC, subnets, gateways |
| EKS Cluster | 10-12 min | Control plane provisioning |
| Node Group | 5-7 min | EC2 instances and joining |
| Helm Charts | 2-3 min | Datadog agent installation |
| Apps Deploy | 1-2 min | MySQL and application pods |
| **Total** | **20-27 min** | End-to-end deployment |

## Datadog Monitoring

### What Gets Monitored

1. **Infrastructure Monitoring**
   - EKS cluster health
   - Node metrics (CPU, memory, disk)
   - Pod resource usage
   - Container metrics

2. **APM (Application Performance Monitoring)**
   - Request traces
   - Service dependencies
   - Performance metrics
   - Error tracking

3. **Cloud Workload Security (CWS)**
   - Privileged container execution
   - Root user processes
   - Cryptomining connections
   - File integrity monitoring
   - Process monitoring

4. **Application Security (ASM)**
   - SQL injection attempts
   - XSS attacks
   - IDOR exploitation
   - Attack attempts and blocks

5. **Compliance & Posture**
   - CIS Kubernetes benchmarks
   - Pod security violations
   - Network policy issues
   - Configuration drift

### Expected Detection Time

| Security Event | Detection Time |
|----------------|----------------|
| Privileged pods | 1-2 minutes |
| Root execution | 1-2 minutes |
| Cryptomining | 2-5 minutes |
| SQL injection | Real-time |
| Network violations | 2-5 minutes |
| Compliance issues | 5-10 minutes |

## Testing Scenarios

### 1. Cryptomining Detection
```bash
POD=$(kubectl get pods -n insecure-pizza-coffee -l app=pizza-coffee -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $POD -n insecure-pizza-coffee -- /app/mining-connection.sh
```

### 2. SQL Injection
```bash
APP_URL=$(kubectl get svc pizza-coffee-service -n insecure-pizza-coffee -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl "http://$APP_URL/api/search?q=pizza' OR '1'='1"
```

### 3. View Security Events
```bash
# Datadog agent status
DD_POD=$(kubectl get pods -n insecure-pizza-coffee -l app=datadog -o jsonpath='{.items[0].metadata.name}')
kubectl exec -it $DD_POD -n insecure-pizza-coffee -- agent status
```

### 4. Check Compliance
View in Datadog UI:
- Security → Cloud Security Management → Compliance
- Filter by cluster: `insecure-pizza-coffee-eks`

## Cleanup Process

### Important: Delete in Order

```bash
# 1. Delete namespace (triggers LoadBalancer deletion)
kubectl delete namespace insecure-pizza-coffee

# 2. Wait for LoadBalancer to be deleted (IMPORTANT!)
echo "Waiting 60 seconds for LoadBalancer cleanup..."
sleep 60

# 3. Verify no LoadBalancers remain
aws elb describe-load-balancers --region us-east-1
aws elbv2 describe-load-balancers --region us-east-1

# 4. Destroy Terraform resources
terraform destroy

# 5. Confirm deletion
terraform show  # Should show no resources
```

### If Terraform Destroy Fails

```bash
# Force delete node group
aws eks delete-nodegroup \
  --cluster-name insecure-pizza-coffee-eks \
  --nodegroup-name insecure-pizza-coffee-eks-nodes \
  --region us-east-1

# Force delete cluster
aws eks delete-cluster \
  --name insecure-pizza-coffee-eks \
  --region us-east-1

# Delete VPC manually from AWS Console
```

## Troubleshooting

### Common Issues

#### 1. Terraform Apply Fails
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check service quotas
aws service-quotas list-service-quotas \
  --service-code eks \
  --region us-east-1
```

#### 2. Nodes Not Joining
```bash
# Check node group status
aws eks describe-nodegroup \
  --cluster-name insecure-pizza-coffee-eks \
  --nodegroup-name insecure-pizza-coffee-eks-nodes \
  --region us-east-1

# Check node logs (SSH into node)
ssh -i eks-nodes-key.pem ec2-user@<node-ip>
sudo cat /var/log/cloud-init-output.log
```

#### 3. Pods Pending
```bash
# Check pod events
kubectl describe pod <pod-name> -n insecure-pizza-coffee

# Check node resources
kubectl top nodes
```

#### 4. Application Not Accessible
```bash
# Check service
kubectl get svc pizza-coffee-service -n insecure-pizza-coffee

# Check pod logs
kubectl logs -l app=pizza-coffee -n insecure-pizza-coffee --tail=100
```

## Security Testing Checklist

- [ ] Deploy infrastructure successfully
- [ ] Verify Datadog agent is reporting
- [ ] Trigger cryptomining detection
- [ ] Test SQL injection vulnerability
- [ ] Test XSS vulnerability
- [ ] Check privileged container alerts
- [ ] Verify root execution detection
- [ ] Review compliance violations
- [ ] Test network policy issues
- [ ] Verify secret exposure detection
- [ ] Check public API access
- [ ] Test IMDSv1 metadata access
- [ ] Review cost and cleanup

## Best Practices (That We Ignore)

This deployment intentionally violates these best practices:

### AWS
- [ ] Use private EKS endpoints
- [ ] Enable VPC flow logs
- [ ] Use IMDSv2 only
- [ ] Encrypt EBS volumes
- [ ] Enable EKS audit logs
- [ ] Use least privilege IAM
- [ ] Implement WAF
- [ ] Enable GuardDuty

### Kubernetes
- [ ] Use Pod Security Standards
- [ ] Implement network policies
- [ ] Run as non-root
- [ ] Use read-only root filesystem
- [ ] Set resource limits
- [ ] Use private registries
- [ ] Enable image scanning
- [ ] Use service mesh

### Application
- [ ] Implement input validation
- [ ] Use prepared statements
- [ ] Enable HTTPS only
- [ ] Rotate secrets regularly
- [ ] Use strong session management
- [ ] Implement rate limiting
- [ ] Enable security headers
- [ ] Regular dependency updates

## Additional Resources

- [Terraform Files](./terraform/)
- [Application Documentation](../README.md)
- [Datadog CWS Setup](../DATADOG-CWS-SETUP.md)
- [Security Features](../SECURITY-FEATURES.md)
- [Mining Simulation](../MINING-SIMULATION.md)

## Support & Feedback

For issues or questions:
1. Check Terraform output for errors
2. Review AWS CloudWatch logs
3. Check Datadog agent status
4. Verify kubectl connectivity
5. Review README troubleshooting section

---

**Remember**: This is for security testing only. Always destroy resources after use to avoid costs and security risks.

**Estimated Setup Time**: 30-45 minutes
**Estimated Monthly Cost**: $238 (if running 24/7)
**Estimated Testing Value**: Priceless for security training 🛡️
