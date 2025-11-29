// Initialize Datadog tracer FIRST before any other imports
const tracer = require('dd-trace').init({
  // APM Configuration
  logInjection: true,
  runtimeMetrics: true,
  profiling: true,

  // Application Security Management (ASM)
  appsec: {
    enabled: process.env.DD_APPSEC_ENABLED === 'true',
    wafTimeout: parseInt(process.env.DD_APPSEC_WAF_TIMEOUT) || 5000,
    rateLimit: parseInt(process.env.DD_APPSEC_RATE_LIMIT) || 100,
    rules: process.env.DD_APPSEC_RULES,
    // Enable blocking mode (default is monitoring only)
    blockingMode: process.env.DD_APPSEC_BLOCKING_ENABLED === 'true',
    // Report API security metrics
    apiSecurity: {
      enabled: process.env.DD_API_SECURITY_ENABLED === 'true',
      requestSampling: parseFloat(process.env.DD_API_SECURITY_REQUEST_SAMPLE_RATE) || 0.1
    }
  },

  // Interactive Application Security Testing (IAST)
  iast: {
    enabled: process.env.DD_IAST_ENABLED === 'true',
    requestSampling: parseFloat(process.env.DD_IAST_REQUEST_SAMPLING) || 100,
    maxConcurrentRequests: parseInt(process.env.DD_IAST_MAX_CONCURRENT_REQUESTS) || 2,
    maxContextOperations: parseInt(process.env.DD_IAST_MAX_CONTEXT_OPERATIONS) || 2
  },

  // Remote Configuration (required for ASM features like blocking)
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

// Custom middleware to add Datadog trace context
app.use((req, res, next) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag('http.url', req.url);
    span.setTag('http.method', req.method);
    if (req.session && req.session.userId) {
      span.setTag('usr.id', req.session.userId);
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

// Error handler with Datadog integration
app.use((err, req, res, next) => {
  const span = tracer.scope().active();
  if (span) {
    span.setTag('error', true);
    span.setTag('error.message', err.message);
    span.setTag('error.stack', err.stack);
  }

  console.error('Error:', err);
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
  console.log(`Insecure Pizza & Coffee app listening on port ${PORT}`);
  console.log(`Datadog APM enabled: ${process.env.DD_TRACE_ENABLED}`);
  console.log(`Datadog ASM enabled: ${process.env.DD_APPSEC_ENABLED}`);
  console.log(`Datadog IAST enabled: ${process.env.DD_IAST_ENABLED}`);
});

module.exports = app;
