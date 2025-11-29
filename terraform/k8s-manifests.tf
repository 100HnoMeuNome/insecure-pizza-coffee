# Kubernetes Deployments and Services
# INSECURE configurations for security testing

# MySQL StatefulSet
resource "kubernetes_stateful_set" "mysql" {
  metadata {
    name      = "mysql"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "mysql"
    }
  }

  spec {
    service_name = "mysql-service"
    replicas     = 1

    selector {
      match_labels = {
        app = "mysql"
      }
    }

    template {
      metadata {
        labels = {
          app = "mysql"
        }
      }

      spec {
        # INSECURE: Run as root
        security_context {
          run_as_user = 0
          fs_group    = 0
        }

        container {
          name  = "mysql"
          image = "mysql:8.0"

          port {
            container_port = 3306
            name           = "mysql"
          }

          env {
            name = "MYSQL_ROOT_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_ROOT_PASSWORD"
              }
            }
          }

          env {
            name  = "MYSQL_DATABASE"
            value = "pizzacoffee"
          }

          env {
            name  = "MYSQL_USER"
            value = "pizzauser"
          }

          env {
            name = "MYSQL_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }

          volume_mount {
            name       = "mysql-data"
            mount_path = "/var/lib/mysql"
          }

          # INSECURE: No resource limits
          resources {
            requests = {
              memory = "512Mi"
              cpu    = "250m"
            }
          }
        }

        volume {
          name = "mysql-data"
          empty_dir {}  # INSECURE: No persistent storage
        }
      }
    }
  }
}

# MySQL Service
resource "kubernetes_service" "mysql" {
  metadata {
    name      = "mysql-service"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "mysql"
    }

    port {
      port        = 3306
      target_port = 3306
    }

    cluster_ip = "None"  # Headless service
  }
}

# Application Deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "pizza-coffee-app"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "pizza-coffee"
    }
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "pizza-coffee"
      }
    }

    template {
      metadata {
        labels = {
          app = "pizza-coffee"
          tags_datadoghq_com_service = "insecure-pizza-coffee"
          tags_datadoghq_com_env     = var.environment
          tags_datadoghq_com_version = "1.0.0"
        }
        annotations = {
          "ad.datadoghq.com/pizza-coffee-app.logs" = "[{\"source\":\"nodejs\",\"service\":\"insecure-pizza-coffee\"}]"
        }
      }

      spec {
        # INSECURE: No pod security context
        security_context {
          run_as_non_root = false  # INSECURE: Allow root
        }

        container {
          name  = "app"
          image = "your-ecr-repo/insecure-pizza-coffee:latest"  # Update with your ECR repository

          image_pull_policy = "Always"

          port {
            container_port = 3000
            name           = "http"
          }

          # INSECURE: Privileged container
          security_context {
            privileged                 = true   # INSECURE
            run_as_user                = 0      # INSECURE: root
            allow_privilege_escalation = true   # INSECURE
            read_only_root_filesystem  = false  # INSECURE
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.app.metadata[0].name
            }
          }

          env {
            name = "SESSION_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "SESSION_SECRET"
              }
            }
          }

          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }

          env {
            name = "DD_API_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.datadog.metadata[0].name
                key  = "api-key"
              }
            }
          }

          # INSECURE: No resource limits
          resources {
            requests = {
              memory = "256Mi"
              cpu    = "100m"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 3000
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 3000
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [kubernetes_stateful_set.mysql]
}

# Application Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "pizza-coffee-service"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "pizza-coffee"
    }

    port {
      port        = 80
      target_port = 3000
      protocol    = "TCP"
    }

    type = "LoadBalancer"  # Publicly accessible
  }
}

# INSECURE: Network Policy - Allow all traffic
resource "kubernetes_network_policy" "allow_all" {
  metadata {
    name      = "allow-all"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {}  # Applies to all pods

    ingress {
      from {
        pod_selector {}
      }
      from {
        namespace_selector {}
      }
    }

    egress {
      to {
        pod_selector {}
      }
      to {
        namespace_selector {}
      }
    }

    policy_types = ["Ingress", "Egress"]
  }
}
