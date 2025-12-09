const winston = require('winston');
const tracer = require('dd-trace');

// Custom format to inject Datadog trace context into logs
const datadogFormat = winston.format((info) => {
  const span = tracer.scope().active();

  if (span) {
    // Add Datadog trace correlation fields
    info.dd = {
      trace_id: span.context().toTraceId(),
      span_id: span.context().toSpanId(),
      service: process.env.DD_SERVICE || 'insecure-pizza-coffee',
      env: process.env.DD_ENV || 'development',
      version: process.env.DD_VERSION || '1.0.0'
    };
  }

  return info;
});

// Create Winston logger with Datadog integration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    datadogFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.DD_SERVICE || 'insecure-pizza-coffee',
    env: process.env.DD_ENV || 'development'
  },
  transports: [
    // Console transport - JSON format for easy parsing
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),

    // File transport for JSON logs (Datadog Agent will collect these)
    new winston.transports.File({
      filename: '/var/log/pizzacoffee/app.log',
      format: winston.format.json(),
      handleExceptions: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: '/var/log/pizzacoffee/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: '/var/log/pizzacoffee/rejections.log' })
  ]
});

// Fallback to console if file logging fails (e.g., directory doesn't exist)
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

module.exports = logger;
