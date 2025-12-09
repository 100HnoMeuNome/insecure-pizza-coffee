FROM node:18

# Datadog git tracking
ARG DD_GIT_REPOSITORY_URL
ARG DD_GIT_COMMIT_SHA
ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL}
ENV DD_GIT_COMMIT_SHA=${DD_GIT_COMMIT_SHA}

# VULNERABILITY: Install additional packages that increase attack surface
# These packages provide more tools for attackers and have known vulnerabilities
RUN apt-get update && apt-get install -y \
    # System utilities
    curl \
    wget \
    netcat-traditional \
    procps \
    net-tools \
    iputils-ping \
    dnsutils \
    vim \
    nano \
    # Development tools (useful for attackers)
    gcc \
    g++ \
    make \
    git \
    # Network tools
    telnet \
    nmap \
    tcpdump \
    # Shell utilities
    bash \
    zsh \
    # File transfer
    ftp \
    openssh-client \
    # Python (for exploit scripts)
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# VULNERABILITY: Install outdated packages with known CVEs
# These will be detected by Datadog SCA
# Using --break-system-packages is INTENTIONALLY INSECURE (PEP 668 violation)
RUN pip3 install --no-cache-dir --break-system-packages \
    requests==2.25.1 \
    urllib3==1.26.5 \
    && apt-get clean

# VULNERABILITY: Run as root user (no user isolation)
# Default node:18 image runs as root, which is insecure
# Attackers can gain full container privileges

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# VULNERABILITY: Set overly permissive file permissions
# Allow all users to read/write/execute
RUN chmod -R 777 /app

# Create directories for Datadog and application logs
RUN mkdir -p /etc/datadog /var/log/pizzacoffee && \
    chmod 777 /var/log/pizzacoffee && \
    chmod 777 /etc/datadog

# VULNERABILITY: Add sensitive files that attackers can discover
RUN echo "INTERNAL_API_KEY=super_secret_key_12345" > /app/.secrets && \
    echo "DATABASE_BACKUP_PASSWORD=backup_pass_9876" >> /app/.secrets && \
    echo "AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" >> /app/.secrets && \
    echo "AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" >> /app/.secrets && \
    chmod 644 /app/.secrets

# VULNERABILITY: Leave bash history with sensitive commands
RUN echo "mysql -u root -prootpass123 pizzacoffee" > /root/.bash_history && \
    echo "curl -X POST https://api.example.com/webhook -d @secrets.json" >> /root/.bash_history && \
    chmod 644 /root/.bash_history

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
