// Initialize Datadog tracer FIRST before any other imports
const tracer = require('dd-trace').init({
  // APM Configuration
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,

  // Application Security Management (ASM)
  appsec: {
    enabled: process.env.DD_APPSEC_ENABLED === 'true'
  },

  // Interactive Application Security Testing (IAST)
  iast: {
    enabled: process.env.DD_IAST_ENABLED === 'true'
  },

  // Remote Configuration
  remoteConfig: {
    enabled: process.env.DD_REMOTE_CONFIGURATION_ENABLED !== 'false'
  }
});

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
// VULNERABILITY: Using cookie-session instead of express-session
// This stores session data in client-side cookies instead of server-side
// Security risks: session data tampering, data exposure, size limitations
const session = require('cookie-session');
const path = require('path');
const i18n = require('i18n');
const logger = require('./config/logger');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure i18n
i18n.configure({
  locales: ['en', 'pt-BR', 'es'],
  defaultLocale: 'pt-BR',
  directory: path.join(__dirname, '..', 'locales'),
  cookie: 'lang',
  queryParameter: 'lang',
  autoReload: true,
  syncFiles: true,
  updateFiles: false
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(i18n.init);
app.use(express.static(path.join(__dirname, 'public')));

// VULNERABILITY: Intentionally insecure cookie-session configuration
// Security Issues:
// 1. Session data stored in CLIENT-SIDE cookies (can be read/modified by user)
// 2. No server-side validation of session integrity
// 3. Session data visible in browser dev tools
// 4. Weak secret key makes signing vulnerable
// 5. httpOnly: false makes cookies accessible via JavaScript (XSS attacks)
// 6. secure: false allows transmission over HTTP (MITM attacks)
app.use(session({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'insecure-secret', 'backup-key'],

  // Cookie options - all insecure for testing
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: false,    // VULNERABILITY: Allows transmission over HTTP
  httpOnly: false,  // VULNERABILITY: Accessible via JavaScript (XSS)
  signed: true,     // Uses weak secret key
  overwrite: true
}));

// Compatibility patch: cookie-session doesn't have destroy() method
// Add it to avoid errors if any code tries to call req.session.destroy()
app.use((req, res, next) => {
  if (req.session && typeof req.session.destroy !== 'function') {
    req.session.destroy = function(callback) {
      req.session = null;
      if (callback) callback();
    };
  }
  next();
});

// Custom middleware to add Datadog trace context and user information
app.use((req, res, next) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag('http.url', req.url);
    span.setTag('http.method', req.method);

    // Add authenticated user information to traces
    if (req.session && req.session.userId && req.session.user) {
      try {
        // Use tracer.setUser() for ASM user tracking and blocking
        tracer.setUser({
          id: req.session.userId.toString(),
          email: req.session.user.email || undefined,
          name: req.session.user.username || undefined,
          // Custom fields
          isAdmin: req.session.user.isAdmin || false,
          sessionId: req.sessionID || undefined
        });

        // Also set as span tags for backwards compatibility
        span.setTag('usr.id', req.session.userId);
        span.setTag('usr.name', req.session.user.username);
        span.setTag('usr.email', req.session.user.email);
        span.setTag('usr.is_admin', req.session.user.isAdmin);
      } catch (error) {
        // If ASM blocks the user, tracer.setUser() will throw an error
        if (error.type === 'aborted') {
          console.log(`[ASM] User blocked: ${req.session.user.username} (ID: ${req.session.userId})`);
          // Clear session for blocked user (cookie-session doesn't have destroy())
          req.session = null;
          res.clearCookie('jwt_token');
          return res.status(403).json({
            error: 'Access blocked by security policy',
            blocked: true
          });
        }
        throw error;
      }
    }
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// Language switcher route
app.get('/change-language/:lang', (req, res) => {
  const lang = req.params.lang;
  if (['en', 'pt-BR', 'es'].includes(lang)) {
    res.cookie('lang', lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
    req.setLocale(lang);
  }
  const redirectTo = req.query.redirect || req.headers.referer || '/';
  res.redirect(redirectTo);
});

app.use('/auth', authRoutes);
app.use('/orders', orderRoutes);
app.use('/payment', paymentRoutes);
app.use('/admin', adminRoutes);

// Error handler with Datadog integration and correlated logging
app.use((err, req, res, next) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag('error', true);
    span.setTag('error.message', err.message);
    span.setTag('error.stack', err.stack);
  }

  // Log error with trace correlation
  logger.error('Application error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.session?.user?.username || 'anonymous'
  });

  res.status(500).render('error', { error: err.message });
});

// Health check endpoint for Kubernetes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info('Insecure Pizza & Coffee application started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    dd_apm_enabled: process.env.DD_TRACE_ENABLED === 'true',
    dd_asm_enabled: process.env.DD_APPSEC_ENABLED === 'true',
    dd_iast_enabled: process.env.DD_IAST_ENABLED === 'true',
    log_injection_enabled: process.env.DD_LOGS_INJECTION === 'true'
  });

  // Also log to console for backward compatibility
  console.log(`Insecure Pizza & Coffee app listening on port ${PORT}`);
  console.log(`Datadog APM enabled: ${process.env.DD_TRACE_ENABLED}`);
  console.log(`Datadog ASM enabled: ${process.env.DD_APPSEC_ENABLED}`);
  console.log(`Datadog IAST enabled: ${process.env.DD_IAST_ENABLED}`);
  console.log(`Log and Trace correlation enabled: ${process.env.DD_LOGS_INJECTION === 'true'}`);
});

module.exports = app;
