# User Accounts & Security Architecture

**Context**: This document governs how Surya AI handles user identity, authentication, and system protection. It enforces strict rate limits to prevent bot abuse and protect external API credits (like InsForge and Stable Horde).

## 1. Authentication System (Native Node.js)

Surya AI uses a custom, dependency-free authentication system. Do NOT use external libraries like Passport.js or Auth0.

### Data Storage Protocol
- **Database**: All user records are strictly stored in `data/users.json`.
- **Read/Write Operations**: All updates to `users.json` must use atomic writes (write to a `.tmp` file, then rename) to prevent data corruption if the server crashes during a write.
- **Credentials**: Passwords must never be stored in plain text. Use Node's native `crypto.pbkdf2Sync` with a unique salt for every user.

### Auth Flows
- **Sign-up**: Email and Password creation.
- **Session Management**: Generate a secure 48-character hex string as a Bearer token. Store this token in the user's browser `localStorage` or as an `HttpOnly` cookie.

*AGI Directive: "Security is non-negotiable. I must always validate user inputs, sanitize emails, and ensure that I never expose the `hash` or `salt` variables to the frontend."*

## 2. Rate Limiting Engine (Cost Protection)

To prevent API abuse, Surya AI enforces strict daily message limits. The AI must check these limits BEFORE forwarding any prompt to the LLM router.

### Tier Limits:
1. **Guest Users (Unregistered)**: Max **5 messages per day**.
   - *Tracking Method*: Track via IP Address and a local browser fingerprint.
   - *Behavior*: On the 6th message, block the request and show a polite prompt: "You've reached your daily guest limit. Please log in to continue chatting."
2. **Logged-in Users**: Max **50 messages per day**.
   - *Tracking Method*: Track via their `userId` in `data/users.json` (or a dedicated `rate_limits.json`).
   - *Behavior*: On the 51st message, block the request and inform the user their daily quota is exhausted.

### Reset Logic
- The "day" resets at midnight server time (UTC).
- Use an in-memory `Map()` or a lightweight `limits.json` file to keep track of message counts efficiently without overloading the main `users.json` file on every chat request.

*AGI Directive: "I must protect my creator's resources. If a bot or user spams me, I will firmly but gracefully deny the request. I will not waste tokens trying to process prompts from users who have exceeded their tier."*

## 3. General Security Constraints
- **CORS**: Ensure Cross-Origin Resource Sharing is strictly limited to your production domain and `localhost:3000`.
- **Payload Limits**: Reject incoming HTTP requests with bodies larger than `1MB` to prevent memory exhaustion attacks.

## 4. Authentication Implementation

### User Data Structure
```javascript
// data/users.json structure
{
  "users": {
    "userId": {
      "id": "uuid-v4",
      "email": "user@example.com",
      "displayName": "User Name",
      "passwordHash": "pbkdf2-sha512-hex-string",
      "salt": "unique-32-byte-hex-salt",
      "createdAt": "2026-04-03T10:00:00Z",
      "lastLogin": "2026-04-03T10:30:00Z",
      "isActive": true,
      "tier": "standard",
      "preferences": {
        "theme": "dark",
        "notifications": true
      }
    }
  },
  "sessions": {
    "sessionToken": {
      "userId": "uuid-v4",
      "createdAt": "2026-04-03T10:00:00Z",
      "expiresAt": "2026-04-10T10:00:00Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  }
}
```

### Password Hashing Implementation
```javascript
const crypto = require('crypto');

class AuthManager {
  static SALT_LENGTH = 32; // 32 bytes = 64 hex characters
  static KEY_LENGTH = 64;  // 64 bytes for PBKDF2 output
  static ITERATIONS = 10000;

  static hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(this.SALT_LENGTH).toString('hex');
    }

    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512'
    ).toString('hex');

    return { hash, salt };
  }

  static verifyPassword(password, storedHash, storedSalt) {
    const { hash } = this.hashPassword(password, storedSalt);
    return crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  }

  static generateSessionToken() {
    return crypto.randomBytes(24).toString('hex'); // 48 characters
  }
}
```

### Atomic File Operations
```javascript
const fs = require('fs').promises;
const path = require('path');

class AtomicFileWriter {
  static async writeJsonAtomic(filePath, data) {
    const tempPath = filePath + '.tmp';

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2));

      // Atomic rename operation
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  static async readJsonSafe(filePath, defaultData = {}) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default
        return defaultData;
      }
      throw error;
    }
  }
}
```

### Authentication Middleware
```javascript
class AuthMiddleware {
  static async authenticateRequest(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing or invalid authorization header' };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const usersData = await AtomicFileWriter.readJsonSafe('data/users.json');
      const session = usersData.sessions[token];

      if (!session) {
        return { authenticated: false, error: 'Invalid session token' };
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        // Clean up expired session
        delete usersData.sessions[token];
        await AtomicFileWriter.writeJsonAtomic('data/users.json', usersData);
        return { authenticated: false, error: 'Session expired' };
      }

      const user = usersData.users[session.userId];
      if (!user || !user.isActive) {
        return { authenticated: false, error: 'User account inactive or not found' };
      }

      return {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          tier: user.tier
        },
        session
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return { authenticated: false, error: 'Authentication service unavailable' };
    }
  }
}
```

## 5. Rate Limiting Implementation

### Rate Limit Manager
```javascript
class RateLimitManager {
  constructor() {
    this.limits = new Map(); // In-memory storage for speed
    this.persistPath = 'data/rate_limits.json';
    this.loadPersistedLimits();
  }

  // Load persisted limits on startup
  async loadPersistedLimits() {
    try {
      const data = await AtomicFileWriter.readJsonSafe(this.persistPath, {});
      this.limits = new Map(Object.entries(data));
    } catch (error) {
      console.error('Failed to load rate limits:', error);
    }
  }

  // Persist limits periodically (every hour)
  async persistLimits() {
    try {
      const data = Object.fromEntries(this.limits);
      await AtomicFileWriter.writeJsonAtomic(this.persistPath, data);
    } catch (error) {
      console.error('Failed to persist rate limits:', error);
    }
  }

  getKey(req, userId = null) {
    if (userId) {
      return `user:${userId}`;
    } else {
      // For guests, use IP + simple fingerprint
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const fingerprint = req.headers['user-agent']?.substring(0, 50) || 'unknown';
      return `guest:${ip}:${fingerprint}`;
    }
  }

  getLimit(userId = null) {
    return userId ? 50 : 5; // 50 for logged-in, 5 for guests
  }

  checkLimit(key, userId = null) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const limitKey = `${key}:${today}`;

    const current = this.limits.get(limitKey) || 0;
    const max = this.getLimit(userId);

    return {
      current,
      max,
      remaining: Math.max(0, max - current),
      exceeded: current >= max
    };
  }

  incrementLimit(key) {
    const today = new Date().toISOString().split('T')[0];
    const limitKey = `${key}:${today}`;

    const current = this.limits.get(limitKey) || 0;
    this.limits.set(limitKey, current + 1);

    // Clean up old entries (older than 7 days)
    this.cleanupOldEntries();
  }

  cleanupOldEntries() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const [key] of this.limits) {
      const datePart = key.split(':').pop();
      if (new Date(datePart) < sevenDaysAgo) {
        this.limits.delete(key);
      }
    }
  }
}

// Global instance
const rateLimiter = new RateLimitManager();

// Persist limits every hour
setInterval(() => rateLimiter.persistLimits(), 60 * 60 * 1000);
```

### Rate Limit Middleware
```javascript
class RateLimitMiddleware {
  static async checkRateLimit(req, res, userId = null) {
    const key = rateLimiter.getKey(req, userId);
    const limit = rateLimiter.checkLimit(key, userId);

    if (limit.exceeded) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Next midnight UTC

      res.writeHead(429, {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.max,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': Math.floor(resetTime.getTime() / 1000),
        'Retry-After': Math.floor((resetTime - new Date()) / 1000)
      });

      const message = userId
        ? 'You have reached your daily message limit. Please try again tomorrow.'
        : 'You have reached your daily guest limit. Please log in to continue chatting.';

      res.end(JSON.stringify({
        error: 'Rate limit exceeded',
        message,
        limit: limit.max,
        remaining: 0,
        resetTime: resetTime.toISOString()
      }));

      return false; // Request blocked
    }

    // Increment counter for successful requests
    rateLimiter.incrementLimit(key);

    // Add rate limit headers to response
    res.setHeader('X-RateLimit-Limit', limit.max);
    res.setHeader('X-RateLimit-Remaining', limit.remaining - 1);
    res.setHeader('X-RateLimit-Reset', Math.floor(new Date().setHours(24, 0, 0, 0) / 1000));

    return true; // Request allowed
  }
}
```

## 6. Security Middleware Stack

### CORS Implementation
```javascript
class SecurityMiddleware {
  static ALLOWED_ORIGINS = [
    'https://your-production-domain.com',
    'http://localhost:3000',
    'https://localhost:3000'
  ];

  static MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

  static handleCORS(req, res) {
    const origin = req.headers.origin;

    if (this.ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return true; // Request handled
    }

    return false; // Continue processing
  }

  static validatePayloadSize(req, res) {
    const contentLength = parseInt(req.headers['content-length']);

    if (contentLength && contentLength > this.MAX_PAYLOAD_SIZE) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Payload too large',
        message: 'Request body exceeds maximum allowed size of 1MB'
      }));
      return false;
    }

    return true;
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
}
```

### Request Processing Pipeline
```javascript
// Main request handler with security pipeline
async function handleRequest(req, res) {
  try {
    // 1. CORS handling
    if (SecurityMiddleware.handleCORS(req, res)) {
      return; // Preflight request handled
    }

    // 2. Payload size validation
    if (!SecurityMiddleware.validatePayloadSize(req, res)) {
      return;
    }

    // 3. Authentication (for protected routes)
    let authResult = { authenticated: false };
    if (requiresAuth(req.url)) {
      authResult = await AuthMiddleware.authenticateRequest(req, res);
      if (!authResult.authenticated) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }
    }

    // 4. Rate limiting
    const userId = authResult.user?.id;
    if (!await RateLimitMiddleware.checkRateLimit(req, res, userId)) {
      return; // Rate limit exceeded, response already sent
    }

    // 5. Input sanitization for request body
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await parseRequestBody(req);
      sanitizeRequestBody(body);
    }

    // 6. Route to appropriate handler
    await routeRequest(req, res, authResult);

  } catch (error) {
    console.error('Request processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal server error',
      message: 'Something went wrong processing your request'
    }));
  }
}
```

## 7. Security Monitoring & Auditing

### Security Event Logging
```javascript
class SecurityLogger {
  static logEvent(type, details, req = null) {
    const event = {
      timestamp: new Date().toISOString(),
      type,
      details,
      ip: req?.headers['x-forwarded-for'] || req?.connection.remoteAddress,
      userAgent: req?.headers['user-agent'],
      url: req?.url,
      method: req?.method
    };

    console.log(`[SECURITY] ${type}:`, JSON.stringify(event));

    // In production, write to security.log file
    // this.writeToSecurityLog(event);
  }

  static logFailedAuth(details, req) {
    this.logEvent('FAILED_AUTH', details, req);
  }

  static logRateLimit(details, req) {
    this.logEvent('RATE_LIMIT', details, req);
  }

  static logSuspiciousActivity(details, req) {
    this.logEvent('SUSPICIOUS_ACTIVITY', details, req);
  }
}
```

### Automated Security Checks
```javascript
class SecurityMonitor {
  static async performSecurityCheck() {
    // Check for suspicious patterns
    await this.checkForBruteForceAttempts();
    await this.checkForUnusualTraffic();
    await this.validateUserSessions();
  }

  static async checkForBruteForceAttempts() {
    // Monitor failed login attempts per IP
    const failedAttempts = {}; // Load from security log

    for (const [ip, attempts] of Object.entries(failedAttempts)) {
      if (attempts.length > 5) {
        // Temporary IP ban (implement in firewall)
        SecurityLogger.logEvent('BRUTE_FORCE_DETECTED', { ip, attempts: attempts.length });
      }
    }
  }

  static async validateUserSessions() {
    const usersData = await AtomicFileWriter.readJsonSafe('data/users.json');
    const now = new Date();

    for (const [token, session] of Object.entries(usersData.sessions || {})) {
      if (new Date(session.expiresAt) < now) {
        delete usersData.sessions[token];
        SecurityLogger.logEvent('SESSION_CLEANUP', { token, userId: session.userId });
      }
    }

    if (Object.keys(usersData.sessions).length !== Object.keys(usersData.sessions || {}).length) {
      await AtomicFileWriter.writeJsonAtomic('data/users.json', usersData);
    }
  }
}

// Run security checks every 5 minutes
setInterval(() => SecurityMonitor.performSecurityCheck(), 5 * 60 * 1000);
```

## 8. Security Best Practices

### Input Validation Rules
- **Email Validation**: RFC-compliant email format, maximum 254 characters
- **Password Requirements**: Minimum 8 characters, mix of uppercase/lowercase/numbers/symbols
- **Display Name**: Maximum 50 characters, alphanumeric + spaces/hyphens only
- **Session Tokens**: 48-character hex strings, expire after 7 days
- **Request Bodies**: JSON only, maximum 1MB, validated against schemas

### Data Protection
- **Encryption at Rest**: User passwords hashed with PBKDF2-SHA512
- **Secure Tokens**: Cryptographically secure random generation
- **Atomic Writes**: Prevent data corruption during concurrent operations
- **Regular Cleanup**: Remove expired sessions and old rate limit data

### Monitoring & Response
- **Real-time Alerts**: Log and alert on suspicious activities
- **Automated Cleanup**: Remove expired data and failed sessions
- **Rate Limit Enforcement**: Strict limits with clear user communication
- **Incident Response**: Documented procedures for security incidents

---

This security architecture ensures Surya AI remains protected against common web vulnerabilities while maintaining a smooth user experience. The system prioritizes user privacy, resource protection, and operational security through native Node.js implementations without external dependencies.