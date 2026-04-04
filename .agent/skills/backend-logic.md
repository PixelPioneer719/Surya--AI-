# Backend Logic - Native Node.js & JSON Storage

## Role
Specialized agent for backend development, API routing, and data persistence using native Node.js patterns.

## Core Responsibilities
- Implement native Node.js HTTP server (no Express)
- Design JSON file-based storage systems
- Create custom routing and middleware
- Handle authentication and security
- Manage external API integrations

## Server Architecture
```javascript
const http = require('http');
const server = http.createServer(async (req, res) => {
  try {
    // Custom routing logic
    if (req.url.startsWith('/api/')) {
      await handleAPIRequest(req, res);
    } else {
      await serveStaticFile(req, res);
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});
```

## Routing Patterns
- **URL Parsing**: Manual pathname and query parameter extraction
- **Method Handling**: Separate logic for GET, POST, PUT, DELETE
- **Body Parsing**: Custom JSON parsing with size limits
- **Error Responses**: Consistent error format across all endpoints

## Data Storage Rules
- **JSON Files**: users.json, chats.json for persistence
- **Atomic Writes**: Prevent corruption during updates
- **Backup Strategy**: Regular snapshots of critical data
- **Migration Path**: Plan for database transition

## Authentication Implementation
- **Password Hashing**: PBKDF2 with 10,000 iterations, SHA-512
- **Token Generation**: 48-byte cryptographically secure tokens
- **Session Management**: Bearer token validation
- **Rate Limiting**: Request throttling by IP and endpoint

## Security Standards
- **Input Validation**: Server-side validation for all inputs
- **XSS Protection**: HTML escaping and content sanitization
- **CSRF Prevention**: Token-based protection for state changes
- **API Key Management**: Server-side only, never exposed to client

## External API Integration
- **InsForge Proxy**: Server-side AI API calls
- **Google OAuth**: Secure token exchange and validation
- **Stable Horde**: Image generation with proper error handling
- **Gmail SMTP**: OTP delivery with secure credentials

## Performance Optimization
- **Request Limits**: 10MB body size, timeout handling
- **Memory Management**: Efficient data structures and cleanup
- **Caching Strategy**: Response caching for static content
- **Load Balancing**: Design for horizontal scaling

## Error Handling Patterns
```javascript
// Global exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log and gracefully shutdown
  process.exit(1);
});

// Request error handling
try {
  const result = await processRequest(req);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
} catch (error) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}
```

## Monitoring & Debugging
- **Health Checks**: `/health` endpoint for service monitoring
- **Request Logging**: Comprehensive logging for debugging
- **Performance Metrics**: Response times and error rates
- **Memory Monitoring**: Heap usage and garbage collection

## Deployment Considerations
- **Environment Variables**: Secure configuration management
- **Process Management**: Proper startup and shutdown
- **Log Rotation**: Prevent disk space issues
- **Backup Procedures**: Automated data backup strategies