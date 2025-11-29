# Terraform Outputs

output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  description = "Kubernetes Cluster Name"
  value       = aws_eks_cluster.main.name
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster OIDC Issuer"
  value       = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "node_security_group_id" {
  description = "Security group ID attached to the EKS nodes"
  value       = aws_security_group.nodes.id
}

output "node_role_arn" {
  description = "IAM role ARN for EKS nodes"
  value       = aws_iam_role.nodes.arn
}

output "ssh_private_key_path" {
  description = "Path to SSH private key for nodes (INSECURE)"
  value       = local_file.private_key.filename
  sensitive   = true
}

output "app_service_url" {
  description = "Application LoadBalancer URL (available after deployment)"
  value       = "Run: kubectl get svc pizza-coffee-service -n insecure-pizza-coffee"
}

output "configure_kubectl" {
  description = "Configure kubectl command"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.cluster_name}"
}

output "security_warnings" {
  description = "Security warnings about this deployment"
  value = <<-EOT
  ⚠️  WARNING: This deployment is INTENTIONALLY INSECURE ⚠️

  Security Issues:
  - Public EKS API access from 0.0.0.0/0
  - Security groups allow all traffic
  - No network policies (allow-all policy)
  - Privileged containers running as root
  - No resource limits
  - Unencrypted EBS volumes
  - IMDSv1 enabled (should use IMDSv2)
  - SSH access to worker nodes
  - Secrets stored as plain Kubernetes secrets
  - No pod security policies
  - Admin IAM permissions

  For testing and demonstration purposes ONLY!
  EOT
}
