# API Reference

## Authentication Endpoints

### POST `/api/auth/sign-up`
Register a new adult account with email and password.
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "User Name"
}
```
**Response**: Sends OTP email, stores pending verification.

### POST `/api/auth/verify`
Verify email with OTP code.
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```
**Response**: Creates account and returns auth token.

### POST `/api/auth/sign-in`
Login with existing credentials.
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

### POST `/api/auth/child/sign-up`
Create a child account (simplified).
```json
{
  "name": "Child Name",
  "dob": "2010-01-01",
  "password": "child-password"
}
```

### GET `/api/auth/me`
Get current user profile (requires auth token).

### POST `/api/auth/sign-out`
Logout current user.

### DELETE `/api/auth/delete-account`
Permanently delete user account (triple confirmation required).

## Chat & AI Endpoints

### POST `/api/ai/chat/completion`
Main AI chat endpoint (server-side proxy to InsForge).
```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "model": "surya-pro",
  "stream": true
}
```

### POST `/api/chats/save`
Save conversation history.
```json
{
  "conversationId": "conv-123",
  "messages": [...],
  "title": "Chat Title"
}
```

### GET `/api/chats/load`
Load conversation history for authenticated user.

## Image Generation Endpoints

### GET `/api/image?prompt=...`
Submit image generation job to Stable Horde.
**Parameters**:
- `prompt`: Text description of desired image
- `model`: AI model to use (optional)

### GET `/api/image-status?id=...`
Poll status of image generation job.
**Response**:
```json
{
  "status": "completed|processing|failed",
  "url": "https://...",
  "error": "error message"
}
```

## AI Agent Endpoints

### GET `/api/agent?task=...`
Initiate autonomous task execution.
**Parameters**:
- `task`: Description of task to perform
**Response**: Server-sent events stream with planning and execution updates.

## Google Workspace Endpoints

### POST `/api/connectors/google-workspace/start`
Initiate Google Workspace OAuth flow.

### GET `/api/connectors/google-workspace/status`
Check connection status.

### POST `/api/connectors/google-workspace/disconnect`
Disconnect Google Workspace integration.

### GET `/api/google-workspace/drive/files`
List Google Drive files.
**Parameters**:
- `q`: Search query (optional)
- `pageSize`: Number of results (default: 20)

### GET `/api/google-workspace/docs/:id`
Read a Google Doc by ID.

### GET `/api/google-workspace/slides/:id`
Read a Google Slides presentation by ID.

### POST `/api/google-workspace/docs/create`
Create a new Google Doc.
```json
{
  "title": "Document Title",
  "content": "Document content here..."
}
```

### POST `/api/google-workspace/slides/create`
Create a new Google Slides presentation.
```json
{
  "title": "Presentation Title",
  "slides": [
    {
      "title": "Slide 1",
      "content": "Slide content..."
    }
  ]
}
```

### POST `/api/google-workspace/sheets/create`
Create a new Google Sheet.
```json
{
  "title": "Spreadsheet Title",
  "data": [
    ["Header 1", "Header 2"],
    ["Row 1 Col 1", "Row 1 Col 2"]
  ]
}
```

### GET `/api/google-workspace/query?prompt=...`
Smart query that auto-routes to appropriate Google Workspace service.

## Canvas IDE Endpoints

### GET `/api/canvas/prompt`
Get the Canvas system prompt for AI guidance.

## OAuth Endpoints

### GET `/auth/google`
Initiate Google OAuth login flow.

### GET `/auth/google/callback`
Google OAuth callback handler.

### GET `/auth/github`
Initiate GitHub OAuth flow (for deployment).

### GET `/auth/github/callback`
GitHub OAuth callback handler.

## Response Formats

### Authentication Response
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "accountType": "adult",
    "provider": "google",
    "verified": true
  },
  "token": "bearer-token"
}
```

### Chat Completion Response (Streaming)
```
data: {"chunk": "Hello", "done": false}
data: {"chunk": " world!", "done": true}
```

### Canvas Bundle Format
```json
{
  "plan": "Build a modern todo app with React",
  "files": {
    "package.json": {
      "file": {
        "contents": "{ \"name\": \"todo-app\", \"scripts\": {\"dev\": \"vite\"} }"
      }
    },
    "index.html": {
      "file": {
        "contents": "<!DOCTYPE html><html><head><script src=\"/src/main.jsx\"></script></head><body></body></html>"
      }
    }
  },
  "commands": ["npm install", "npm run dev"]
}
```

## Error Responses
All API endpoints return errors in the following format:
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {} // Optional additional error information
}
```

## Rate Limiting
- **Global**: 100 requests per minute per IP
- **Authentication**: 5 requests per minute per IP
- **AI Chat**: 50 requests per minute per user
- **Image Generation**: 10 requests per minute per user

## Authentication
All protected endpoints require a Bearer token:
```
Authorization: Bearer <token>
```

## Content Types
- **Request**: `application/json` for POST/PUT requests
- **Response**: `application/json` for all responses
- **Streaming**: `text/event-stream` for real-time responses