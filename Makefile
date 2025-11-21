.PHONY: help install dev build up down init-db logs clean k8s-deploy k8s-delete

help: ## Show this help message
	@echo "🍕☕ Insecure Pizza & Coffee - Available Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run in development mode
	npm run dev

build: ## Build Docker image
	docker build -t insecure-pizza-coffee:latest .

up: ## Start with Docker Compose
	docker-compose up -d

down: ## Stop Docker Compose services
	docker-compose down

logs: ## View application logs
	docker-compose logs -f app

init-db: ## Initialize database
	docker-compose exec app npm run init-db

clean: ## Clean up containers and volumes
	docker-compose down -v
	rm -rf node_modules

restart: ## Restart all services
	docker-compose restart

k8s-deploy: ## Deploy to Kubernetes
	cd k8s && ./deploy.sh

k8s-delete: ## Delete from Kubernetes
	kubectl delete namespace insecure-pizza-coffee

k8s-logs: ## View Kubernetes logs
	kubectl logs -f -n insecure-pizza-coffee -l app=pizzacoffee-app

k8s-port-forward: ## Port forward to Kubernetes service
	kubectl port-forward -n insecure-pizza-coffee svc/pizzacoffee-service 3000:80

test-sql-injection: ## Test SQL injection vulnerability
	@echo "Testing SQL injection on login..."
	@curl -X POST http://localhost:3000/auth/login \
		-H "Content-Type: application/x-www-form-urlencoded" \
		-d "username=admin' OR '1'='1&password=anything" \
		-c cookies.txt -L

test-idor: ## Test IDOR vulnerability
	@echo "Testing IDOR - accessing other users' orders..."
	@curl "http://localhost:3000/orders/my-orders?userId=1" -b cookies.txt

status: ## Check service status
	@echo "Docker Compose Services:"
	@docker-compose ps
	@echo ""
	@echo "Kubernetes Pods:"
	@kubectl get pods -n insecure-pizza-coffee 2>/dev/null || echo "Not deployed to Kubernetes"

dd-check: ## Check Datadog Agent status
	@echo "Checking Datadog Agent..."
	@docker-compose exec datadog-agent agent status || echo "Datadog Agent not running in Docker Compose"
	@kubectl exec -n datadog -l app=datadog-agent -- agent status 2>/dev/null || echo "Datadog Agent not running in Kubernetes"
