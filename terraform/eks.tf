# INSECURE EKS Cluster Configuration
# WARNING: This configuration intentionally disables security features

# IAM Role for EKS Cluster (with excessive permissions)
resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

# Attach AWS managed policies (broad permissions)
resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_vpc_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.cluster.name
}

# INSECURE: Additional admin policy
resource "aws_iam_role_policy_attachment" "cluster_admin" {
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  role       = aws_iam_role.cluster.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    security_group_ids      = [aws_security_group.cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = var.enable_public_access # INSECURE: Public API access
    public_access_cidrs     = ["0.0.0.0/0"]           # INSECURE: Open to internet
  }

  # INSECURE: Disable encryption
  encryption_config {
    resources = ["secrets"]
    provider {
      key_arn = aws_kms_key.eks.arn
    }
  }

  # INSECURE: Minimal logging
  enabled_cluster_log_types = [] # No logs for security testing

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_iam_role_policy_attachment.cluster_vpc_policy,
  ]

  tags = {
    Name = var.cluster_name
  }
}

# KMS Key (weak configuration for testing)
resource "aws_kms_key" "eks" {
  description             = "EKS encryption key (insecure)"
  deletion_window_in_days = 7 # INSECURE: Short deletion window
  enable_key_rotation     = false # INSECURE: No key rotation

  tags = {
    Name = "${var.cluster_name}-kms"
  }
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${var.cluster_name}-eks"
  target_key_id = aws_kms_key.eks.key_id
}

# IAM Role for Worker Nodes
resource "aws_iam_role" "nodes" {
  name = "${var.cluster_name}-nodes-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Attach policies for worker nodes (excessive permissions)
resource "aws_iam_role_policy_attachment" "nodes_worker" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.nodes.name
}

resource "aws_iam_role_policy_attachment" "nodes_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.nodes.name
}

resource "aws_iam_role_policy_attachment" "nodes_ecr" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.nodes.name
}

# INSECURE: Full EC2 access
resource "aws_iam_role_policy_attachment" "nodes_ec2_full" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
  role       = aws_iam_role.nodes.name
}

# EKS Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = [var.node_instance_type]

  scaling_config {
    desired_size = var.desired_nodes
    max_size     = var.max_nodes
    min_size     = var.min_nodes
  }

  # INSECURE: Allow remote access with no source restrictions
  remote_access {
    ec2_ssh_key               = aws_key_pair.nodes.key_name
    source_security_group_ids = [] # INSECURE: No restrictions
  }

  update_config {
    max_unavailable = 1
  }

  # User data for nodes (no hardening)
  launch_template {
    id      = aws_launch_template.nodes.id
    version = "$Latest"
  }

  depends_on = [
    aws_iam_role_policy_attachment.nodes_worker,
    aws_iam_role_policy_attachment.nodes_cni,
    aws_iam_role_policy_attachment.nodes_ecr,
  ]

  tags = {
    Name = "${var.cluster_name}-nodes"
  }
}

# SSH Key Pair (INSECURE: Generated without passphrase)
resource "tls_private_key" "nodes" {
  algorithm = "RSA"
  rsa_bits  = 2048 # INSECURE: Should be 4096
}

resource "aws_key_pair" "nodes" {
  key_name   = "${var.cluster_name}-nodes"
  public_key = tls_private_key.nodes.public_key_openssh

  tags = {
    Name = "${var.cluster_name}-nodes-keypair"
  }
}

# Save private key locally (INSECURE)
resource "local_file" "private_key" {
  content         = tls_private_key.nodes.private_key_pem
  filename        = "${path.module}/eks-nodes-key.pem"
  file_permission = "0600"
}

# Launch Template for Nodes
resource "aws_launch_template" "nodes" {
  name_prefix   = "${var.cluster_name}-node-"
  instance_type = var.node_instance_type

  # INSECURE: Disable IMDSv2
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "optional" # INSECURE: Should be "required"
    http_put_response_hop_limit = 2
  }

  # INSECURE: No encryption on EBS volumes
  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      encrypted             = false # INSECURE
      delete_on_termination = true
    }
  }

  network_interfaces {
    associate_public_ip_address = true # INSECURE
    security_groups             = [aws_security_group.nodes.id]
    delete_on_termination       = true
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.cluster_name}-node"
    }
  }
}

# OIDC Provider for EKS (required for service accounts)
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Name = "${var.cluster_name}-oidc"
  }
}
