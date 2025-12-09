const { verifyToken } = require('../utils/jwt');
const tracer = require('dd-trace');

/**
 * JWT Authentication Middleware - INTENTIONALLY VULNERABLE
 *
 * VULNERABILITIES:
 * - Accepts JWT from multiple sources (header, query, cookie)
 * - No rate limiting on failed attempts
 * - Stores sensitive data from JWT in session
 * - No token refresh mechanism
 */
function authenticateJWT(req, res, next) {
  const span = tracer.scope().active();

  // VULNERABILITY: Accepting token from multiple sources (attack surface)
  const token =
    req.headers['authorization']?.replace('Bearer ', '') || // Header
    req.query.token || // Query string (logged in URLs!)
    req.cookies.jwt_token || // Cookie
    req.body.token; // Body (for POST requests)

  if (span) {
    span.setTag('vulnerability.type', 'jwt_multiple_sources');
    span.setTag('vulnerability.category', 'authentication_failure');
    span.setTag('jwt.source', token ? 'provided' : 'missing');
    if (req.query.token) {
      span.setTag('vulnerability.jwt_in_url', true); // VULNERABILITY: JWT in URL
      span.setTag('vulnerability.severity', 'high');
    }
  }

  if (!token) {
    // No JWT, fall back to session
    if (req.session && req.session.userId) {
      // Set user information for ASM tracking
      if (req.session.user) {
        tracer.setUser({
          id: req.session.userId.toString(),
          email: req.session.user.email || undefined,
          name: req.session.user.username || undefined,
          isAdmin: req.session.user.isAdmin || false
        });
      }

      if (span) {
        span.setTag('auth.method', 'session');
        span.setTag('usr.id', req.session.userId);
      }
      return next();
    }

    if (span) {
      span.setTag('auth.failed', true);
      span.setTag('auth.reason', 'no_token_or_session');
    }

    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify JWT
  const decoded = verifyToken(token);

  if (!decoded) {
    if (span) {
      span.setTag('auth.failed', true);
      span.setTag('auth.reason', 'invalid_token');
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // VULNERABILITY: Storing JWT data back into session (unnecessary)
  req.session.userId = decoded.id;
  req.session.user = {
    id: decoded.id,
    username: decoded.username,
    email: decoded.email,
    isAdmin: decoded.isAdmin,
    // VULNERABILITY: Storing password hash from JWT in session!
    password: decoded.password
  };

  // VULNERABILITY: Exposing decoded token data to all routes
  req.jwtData = decoded;
  req.user = decoded;

  // Set user information for ASM tracking
  tracer.setUser({
    id: decoded.id.toString(),
    email: decoded.email || undefined,
    name: decoded.username || undefined,
    isAdmin: decoded.isAdmin || false
  });

  if (span) {
    span.setTag('auth.success', true);
    span.setTag('auth.method', 'jwt');
    span.setTag('usr.id', decoded.id);
    span.setTag('usr.name', decoded.username);
    span.setTag('usr.is_admin', decoded.isAdmin);
    span.setTag('jwt.contains_password', !!decoded.password);
  }

  next();
}

/**
 * Optional JWT Authentication - doesn't require token
 * VULNERABILITY: Inconsistent authentication handling
 */
function optionalJWT(req, res, next) {
  const token =
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.token ||
    req.cookies.jwt_token;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.jwtData = decoded;
    }
  }

  next();
}

/**
 * Require Admin - checks JWT or session
 * VULNERABILITY: Trusts client-provided isAdmin flag
 */
function requireAdmin(req, res, next) {
  const span = tracer.scope().active();

  // Check JWT first
  if (req.jwtData && req.jwtData.isAdmin) {
    if (span) {
      span.setTag('auth.admin_check', 'passed_jwt');
      span.setTag('vulnerability.type', 'privilege_escalation_risk');
    }
    return next();
  }

  // Fall back to session
  if (req.session && req.session.user && req.session.user.isAdmin) {
    if (span) {
      span.setTag('auth.admin_check', 'passed_session');
    }
    return next();
  }

  if (span) {
    span.setTag('auth.admin_check', 'failed');
    span.setTag('access.denied', true);
  }

  res.status(403).json({ error: 'Admin access required' });
}

module.exports = {
  authenticateJWT,
  optionalJWT,
  requireAdmin
};
