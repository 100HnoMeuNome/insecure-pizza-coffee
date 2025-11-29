# Kubernetes Provider Configuration
provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      aws_eks_cluster.main.name,
      "--region",
      var.aws_region
    ]
  }
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.main.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)

    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        aws_eks_cluster.main.name,
        "--region",
        var.aws_region
      ]
    }
  }
}

# Create namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "insecure-pizza-coffee"
    labels = {
      name = "insecure-pizza-coffee"
      app  = "pizza-coffee"
    }
  }

  depends_on = [aws_eks_cluster.main]
}

# INSECURE: Datadog API Key as plain Kubernetes secret
resource "kubernetes_secret" "datadog" {
  metadata {
    name      = "datadog-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    api-key = var.datadog_api_key
  }

  type = "Opaque"
}

# INSECURE: Application secrets (hardcoded for testing)
resource "kubernetes_secret" "app" {
  metadata {
    name      = "app-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    SESSION_SECRET = base64encode("insecure-secret-change-me")
    DB_PASSWORD    = base64encode("pizzapass123")
    DB_ROOT_PASSWORD = base64encode("rootpass123")
  }

  type = "Opaque"
}

# ConfigMap for application configuration
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    NODE_ENV                = "production"
    PORT                    = "3000"
    DB_HOST                 = "mysql-service"
    DB_PORT                 = "3306"
    DB_USER                 = "pizzauser"
    DB_NAME                 = "pizzacoffee"
    DD_SITE                 = var.datadog_site
    DD_SERVICE              = "insecure-pizza-coffee"
    DD_ENV                  = var.environment
    DD_VERSION              = "1.0.0"
    DD_TRACE_ENABLED        = "true"
    DD_LOGS_INJECTION       = "true"
    DD_RUNTIME_METRICS_ENABLED = "true"
    DD_APPSEC_ENABLED       = "true"
    DD_APPSEC_WAF_TIMEOUT   = "5000"
    DD_APPSEC_RATE_LIMIT    = "100"
    DD_APPSEC_BLOCKING_ENABLED = "false"
    DD_APPSEC_SCA_ENABLED   = "true"
    DD_API_SECURITY_ENABLED = "true"
    DD_API_SECURITY_REQUEST_SAMPLE_RATE = "1.0"
    DD_IAST_ENABLED         = "true"
    DD_IAST_REQUEST_SAMPLING = "100"
    DD_IAST_MAX_CONCURRENT_REQUESTS = "2"
    DD_IAST_MAX_CONTEXT_OPERATIONS = "2"
    DD_REMOTE_CONFIGURATION_ENABLED = "true"
    DD_AGENT_HOST           = "datadog-agent"
    DD_TRACE_AGENT_PORT     = "8126"
  }
}

# Datadog Agent DaemonSet
resource "helm_release" "datadog" {
  name       = "datadog"
  repository = "https://helm.datadoghq.com"
  chart      = "datadog"
  namespace  = kubernetes_namespace.app.metadata[0].name
  version    = "3.57.0"

  set_sensitive {
    name  = "datadog.apiKey"
    value = var.datadog_api_key
  }

  set {
    name  = "datadog.site"
    value = var.datadog_site
  }

  set {
    name  = "datadog.apm.portEnabled"
    value = "true"
  }

  set {
    name  = "datadog.logs.enabled"
    value = "true"
  }

  set {
    name  = "datadog.logs.containerCollectAll"
    value = "true"
  }

  set {
    name  = "datadog.processAgent.enabled"
    value = "true"
  }

  set {
    name  = "datadog.securityAgent.runtime.enabled"
    value = "true"
  }

  set {
    name  = "datadog.securityAgent.compliance.enabled"
    value = "true"
  }

  set {
    name  = "datadog.clusterAgent.enabled"
    value = "true"
  }

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.app
  ]
}
