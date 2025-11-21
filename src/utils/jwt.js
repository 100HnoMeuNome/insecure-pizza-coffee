// VULNERABILITY: Hardcoded JWT secret - INTENTIONALLY INSECURE
const jwt = require('jsonwebtoken');
const tracer = require('dd-trace');

// VULNERABILITY: Weak, hardcoded secret exposed in source code
const JWT_SECRET = 'pizza123'; // NEVER do this in production!

// VULNERABILITY: Extremely short token expiration for testing
const JWT_EXPIRES_IN = '24h'; // Should be much shorter in production

// VULNERABILITY: Algorithm set to 'none' option available
const WEAK_ALGORITHM = 'HS256'; // Could be exploited with algorithm confusion

/**
 * Generate JWT token with vulnerabilities
 * VULNERABILITIES:
 * - Hardcoded secret
 * - Sensitive data in payload (email, isAdmin)
 * - No token rotation
 * - Predictable token structure
 */
function generateToken(user) {
  const span = tracer.scope().active();

  if (span) {
    span.setTag('vulnerability.type', 'weak_jwt_implementation');
    span.setTag('vulnerability.category', 'authentication_failure');
    span.setTag('jwt.secret', 'hardcoded');
    span.setTag('jwt.algorithm', WEAK_ALGORITHM);
    span.setTag('jwt.secret_strength', 'weak');
    span.setTag('jwt.secret_value', JWT_SECRET); // VULNERABILITY: Logging secret!
    span.setTag('sensitive.data_in_token', true);
  }

  // VULNERABILITY: Including sensitive data in JWT payload
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email || '', // Sensitive data
    isAdmin: user.isAdmin || user.is_admin || false, // Privilege level in token
    password: user.password, // CRITICAL: Never put password in JWT!
    iat: Date.now()
  };

  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      algorithm: WEAK_ALGORITHM,
      expiresIn: JWT_EXPIRES_IN
    });

    if (span) {
      span.setTag('jwt.generated', true);
      span.setTag('jwt.payload_size', JSON.stringify(payload).length);
    }

    return token;
  } catch (error) {
    if (span) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
    }
    throw error;
  }
}

/**
 * Verify JWT token with vulnerabilities
 * VULNERABILITIES:
 * - No token blacklist/revocation
 * - Algorithm confusion possible
 * - Accepts expired tokens in some cases
 */
function verifyToken(token) {
  const span = tracer.scope().active();

  if (span) {
    span.setTag('vulnerability.type', 'jwt_verification');
    span.setTag('jwt.token_present', !!token);
  }

  if (!token) {
    return null;
  }

  try {
    // VULNERABILITY: No algorithm whitelist, susceptible to algorithm confusion
    const decoded = jwt.verify(token, JWT_SECRET);

    if (span) {
      span.setTag('jwt.verified', true);
      span.setTag('jwt.user_id', decoded.id);
      span.setTag('jwt.is_admin', decoded.isAdmin);
    }

    return decoded;
  } catch (error) {
    if (span) {
      span.setTag('jwt.verification_failed', true);
      span.setTag('jwt.error', error.message);
    }

    // VULNERABILITY: Detailed error information disclosure
    console.error('JWT verification failed:', error.message);
    return null;
  }
}

/**
 * Decode JWT without verification - VULNERABLE!
 * This allows attackers to see token contents
 */
function decodeTokenUnsafe(token) {
  const span = tracer.scope().active();

  if (span) {
    span.setTag('vulnerability.type', 'jwt_decode_without_verify');
    span.setTag('vulnerability.severity', 'high');
  }

  try {
    // VULNERABILITY: Decoding without verification
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * VULNERABILITY: Algorithm confusion attack helper
 * Allows changing algorithm without proper validation
 */
function verifyWithAlgorithm(token, algorithm) {
  const span = tracer.scope().active();

  if (span) {
    span.setTag('vulnerability.type', 'algorithm_confusion');
    span.setTag('vulnerability.category', 'cryptographic_failure');
    span.setTag('jwt.algorithm', algorithm);
  }

  try {
    // VULNERABILITY: Accepting algorithm from client
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: [algorithm] });
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  decodeTokenUnsafe,
  verifyWithAlgorithm,
  JWT_SECRET // VULNERABILITY: Exporting secret!
};
