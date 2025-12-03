const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');
const tracer = require('dd-trace');
const { generateToken } = require('../utils/jwt');

// Login page
router.get('/login', (req, res) => {
  res.render('login', { error: null, user: req.session.user || null });
});

// Login handler - INTENTIONALLY VULNERABLE TO SQL INJECTION
router.post('/login', async (req, res) => {
  const span = tracer.scope().active();
  const { username, password } = req.body;

  try {
    // VULNERABILITY: SQL Injection - using string concatenation
    const query = `SELECT * FROM users WHERE username = '${username}'`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('attack.vector', 'sql');
      span.setTag('sql.query', query);
      span.setTag('http.useragent', req.headers['user-agent']);
      span.setTag('http.client_ip', req.ip);
    }

    const [users] = await db.query(query);

    if (users.length === 0) {
      if (span) {
        span.setTag('auth.failure', 'user_not_found');
        span.setTag('appsec.events.users.login.failure.usr.id', username);
        span.setTag('appsec.events.users.login.failure.usr.exists', false);
      }
      return res.render('login', { error: 'Invalid username or password', user: null });
    }

    const user = users[0];

    // VULNERABILITY: Using MD5 for password hashing (extremely weak)
    const md5Password = crypto.createHash('md5').update(password).digest('hex');

    if (span) {
      span.setTag('vulnerability.type', 'weak_crypto');
      span.setTag('vulnerability.category', 'cryptographic_failure');
      span.setTag('crypto.algorithm', 'md5');
      span.setTag('crypto.purpose', 'password_hashing');
    }

    if (md5Password !== user.password) {
      if (span) {
        span.setTag('auth.failure', 'invalid_password');
        span.setTag('appsec.events.users.login.failure.usr.id', user.id.toString());
        span.setTag('appsec.events.users.login.failure.usr.exists', true);
      }
      return res.render('login', { error: 'Invalid username or password', user: null });
    }

    // VULNERABILITY: Generate JWT with hardcoded secret and sensitive data
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      password: user.password // CRITICAL VULNERABILITY: password hash in JWT!
    });

    // Set session (for backward compatibility)
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email, // Add email for Datadog user tracking
      isAdmin: user.is_admin
    };

    // VULNERABILITY: Store JWT in cookie (accessible to JavaScript if httpOnly=false)
    res.cookie('jwt_token', token, {
      httpOnly: false, // VULNERABILITY: Accessible via JavaScript
      secure: false, // VULNERABILITY: Works over HTTP
      maxAge: 24 * 60 * 60 * 1000
    });

    // Set user information in Datadog APM for tracking and blocking capability
    try {
      tracer.setUser({
        id: user.id.toString(),
        email: user.email || undefined,
        name: user.username,
        // Custom fields
        isAdmin: user.is_admin,
        sessionId: req.sessionID || undefined
      });
    } catch (blockError) {
      // If ASM blocks the user during login
      if (blockError.type === 'aborted') {
        console.log(`[ASM] Login blocked for user: ${user.username} (ID: ${user.id})`);
        req.session.destroy();
        return res.status(403).render('login', {
          error: 'Access blocked by security policy. Your account has been flagged for suspicious activity.',
          user: null
        });
      }
      throw blockError;
    }

    if (span) {
      span.setTag('auth.success', true);
      span.setTag('auth.method', 'jwt_and_session');
      span.setTag('usr.id', user.id);
      span.setTag('usr.name', user.username);
      span.setTag('usr.email', user.email);
      span.setTag('usr.is_admin', user.is_admin);
      span.setTag('session.id', req.sessionID);
      span.setTag('jwt.generated', true);
      span.setTag('jwt.stored_in_cookie', true);
      span.setTag('vulnerability.jwt_contains_password', true);
      span.setTag('appsec.events.users.login.success', true);
    }

    res.redirect('/orders/menu');
  } catch (error) {
    console.error('Login error:', error);
    if (span) {
      span.setTag('error', true);
      span.setTag('error.type', error.name);
      span.setTag('error.message', error.message);
      span.setTag('error.stack', error.stack);
    }
    // VULNERABILITY: Information disclosure
    res.render('login', { error: `Error: ${error.message}`, user: null });
  }
});

// Register page
router.get('/register', (req, res) => {
  res.render('register', { error: null, success: null, user: req.session.user || null });
});

// Register handler - INTENTIONALLY VULNERABLE
router.post('/register', async (req, res) => {
  const span = tracer.scope().active();
  const { username, password } = req.body;

  try {
    // VULNERABILITY: Weak password policy - no validation
    // VULNERABILITY: No input sanitization

    if (span) {
      span.setTag('vulnerability.type', 'weak_password_policy');
      span.setTag('vulnerability.category', 'authentication_failure');
      span.setTag('password.length', password ? password.length : 0);
      span.setTag('input.validation', 'none');
    }

    // VULNERABILITY: Using MD5 for password hashing (extremely weak)
    const md5Password = crypto.createHash('md5').update(password).digest('hex');

    if (span) {
      span.setTag('vulnerability.type', 'weak_crypto');
      span.setTag('vulnerability.category', 'cryptographic_failure');
      span.setTag('crypto.algorithm', 'md5');
      span.setTag('crypto.purpose', 'password_hashing');
    }

    // VULNERABILITY: SQL Injection via string interpolation
    const query = `INSERT INTO users (username, password)
                   VALUES ('${username}', '${md5Password}')`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('vulnerability.category', 'injection');
      span.setTag('attack.vector', 'sql');
      span.setTag('sql.query', query);
      span.setTag('http.client_ip', req.ip);
    }

    await db.query(query);

    if (span) {
      span.setTag('registration.success', true);
      span.setTag('user.username', username);
    }

    res.render('register', {
      error: null,
      success: 'Registration successful! You can now login.',
      user: null
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (span) {
      span.setTag('error', true);
      span.setTag('error.type', error.name);
      span.setTag('error.message', error.message);
      span.setTag('vulnerability.type', 'information_disclosure');
    }
    // VULNERABILITY: Information disclosure
    res.render('register', {
      error: `Registration failed: ${error.message}`,
      success: null,
      user: null
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  // VULNERABILITY: JWT not invalidated (no blacklist)
  req.session.destroy();
  res.clearCookie('jwt_token');
  res.redirect('/');
});

// API Login endpoint - returns JWT token directly
router.post('/api/login', async (req, res) => {
  const span = tracer.scope().active();
  const { username, password } = req.body;

  try {
    // VULNERABILITY: SQL Injection
    const query = `SELECT * FROM users WHERE username = '${username}'`;

    if (span) {
      span.setTag('vulnerability.type', 'sql_injection');
      span.setTag('api.endpoint', '/api/login');
      span.setTag('sql.query', query);
    }

    const [users] = await db.query(query);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const md5Password = crypto.createHash('md5').update(password).digest('hex');

    if (md5Password !== user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      password: user.password // VULNERABILITY!
    });

    // Set user information in Datadog APM for tracking and blocking capability
    try {
      tracer.setUser({
        id: user.id.toString(),
        email: user.email || undefined,
        name: user.username,
        // Custom fields
        isAdmin: user.is_admin
      });
    } catch (blockError) {
      // If ASM blocks the user during API login
      if (blockError.type === 'aborted') {
        console.log(`[ASM] API Login blocked for user: ${user.username} (ID: ${user.id})`);
        return res.status(403).json({
          error: 'Access blocked by security policy',
          blocked: true,
          reason: 'Your account has been flagged for suspicious activity'
        });
      }
      throw blockError;
    }

    if (span) {
      span.setTag('auth.success', true);
      span.setTag('auth.method', 'jwt_api');
      span.setTag('usr.id', user.id);
      span.setTag('usr.name', user.username);
      span.setTag('usr.email', user.email);
      span.setTag('usr.is_admin', user.is_admin);
      span.setTag('jwt.exposed_in_response', true);
      span.setTag('appsec.events.users.login.success', true);
    }

    // VULNERABILITY: Returning sensitive data in response
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('API Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Password reset - VULNERABLE to username enumeration
router.post('/reset-password', async (req, res) => {
  const span = tracer.scope().active();
  const { username } = req.body;

  try {
    // VULNERABILITY: Username enumeration + SQL Injection
    const query = `SELECT * FROM users WHERE username = '${username}'`;

    if (span) {
      span.setTag('vulnerability.type', 'username_enumeration');
      span.setTag('vulnerability.category', 'authentication_failure');
      span.setTag('sql.query', query);
      span.setTag('http.client_ip', req.ip);
    }

    const [users] = await db.query(query);

    if (users.length === 0) {
      if (span) {
        span.setTag('enumeration.result', 'user_not_found');
        span.setTag('vulnerability.type', 'information_disclosure');
      }
      return res.json({ error: 'User not found' }); // Leaks information
    }

    if (span) {
      span.setTag('enumeration.result', 'user_exists');
    }

    res.json({ success: 'Password reset link sent to your email' });
  } catch (error) {
    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
    }
    res.json({ error: error.message });
  }
});

module.exports = router;
