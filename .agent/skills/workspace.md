# Workspace Expert - Google OAuth & API Flows

## Role
Specialized agent for Google Workspace integration, OAuth flows, and document API operations.

## Core Responsibilities
- Implement Google OAuth 2.0 authentication
- Manage Google Workspace API integrations
- Handle token refresh and security
- Create document automation workflows
- Ensure proper scope management

## OAuth Implementation
```javascript
// OAuth initiation
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });
  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  const { tokens } = await oauth2Client.getToken(code);
  // Store tokens securely
  await saveUserTokens(userId, tokens);
});
```

## Token Management
- **Access Tokens**: Short-lived (1 hour), auto-refresh
- **Refresh Tokens**: Long-lived, securely stored
- **Encryption**: Tokens encrypted at rest
- **Validation**: Token expiry checking before API calls

## Google Workspace APIs

### Drive API
```javascript
// List files
async function listDriveFiles(accessToken) {
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?' +
    new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.document'",
      orderBy: 'modifiedTime desc',
      pageSize: '20'
    }),
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  return await response.json();
}
```

### Docs API
```javascript
// Read document
async function readGoogleDoc(docId, accessToken) {
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  const doc = await response.json();
  // Extract text content from document structure
}

// Create document
async function createGoogleDoc(title, content, accessToken) {
  // Create empty document
  const createResponse = await fetch(
    'https://docs.googleapis.com/v1/documents',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    }
  );
  const { documentId } = await createResponse.json();

  // Insert content
  await fetch(
    `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          insertText: {
            location: { index: 1 },
            text: content
          }
        }]
      })
    }
  );
}
```

### Slides API
```javascript
// Create presentation
async function createPresentation(title, slides, accessToken) {
  const response = await fetch(
    'https://slides.googleapis.com/v1/presentations',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        slides: slides.map(slide => ({
          slideProperties: {
            slideLayoutReference: {
              predefinedLayout: 'TITLE_AND_BODY'
            }
          },
          pageElements: [
            // Title element
            {
              shape: {
                shapeType: 'TEXT_BOX',
                text: {
                  textElements: [{
                    textRun: {
                      content: slide.title,
                      style: { fontSize: { magnitude: 24, unit: 'PT' } }
                    }
                  }]
                }
              },
              transform: {
                scaleX: 0.8,
                scaleY: 0.1,
                translateX: 0.1,
                translateY: 0.1
              }
            },
            // Content element
            {
              shape: {
                shapeType: 'TEXT_BOX',
                text: {
                  textElements: [{
                    textRun: {
                      content: slide.content,
                      style: { fontSize: { magnitude: 14, unit: 'PT' } }
                    }
                  }]
                }
              },
              transform: {
                scaleX: 0.8,
                scaleY: 0.3,
                translateX: 0.1,
                translateY: 0.3
              }
            }
          ]
        }))
      })
    }
  );
  return await response.json();
}
```

### Sheets API
```javascript
// Create spreadsheet
async function createSpreadsheet(title, data, accessToken) {
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [{
          properties: { title: 'Sheet1' },
          data: [{
            rowData: data.map(row => ({
              values: row.map(cell => ({
                userEnteredValue: { stringValue: cell }
              }))
            }))
          }]
        }]
      })
    }
  );
  return await response.json();
}
```

## Auto-Detection Patterns
```javascript
const workspacePatterns = {
  document: /\b(create|make|write)\s+(a\s+)?doc(ument)?\b/i,
  slides: /\b(create|make|build)\s+(a\s+)?presentation|slides?\b/i,
  sheets: /\b(create|make|build)\s+(a\s+)?spreadsheet|sheet\b/i,
  read: /\b(open|read|show)\s+(my\s+)?doc|slide|sheet\b/i,
  list: /\b(show|list)\s+(my\s+)?drive\s+files\b/i
};
```

## Smart Routing Logic
```
User: "Create a presentation about climate change"
    ↓
Pattern matches: "create a presentation"
    ↓
Route to: Google Slides API
    ↓
AI generates slide content
    ↓
Create presentation via API
    ↓
Return shareable link
```

## Error Handling
- **Token Expiry**: Automatic refresh on 401 errors
- **Rate Limits**: Exponential backoff for API quota exceeded
- **Network Issues**: Retry logic with timeout handling
- **Permission Errors**: Clear error messages for scope issues

## Security Considerations
- **Scope Minimization**: Only request necessary permissions
- **Token Storage**: Encrypted storage with proper key management
- **Request Validation**: Server-side validation of all inputs
- **Audit Logging**: Track API usage and access patterns

## Performance Optimization
- **Batch Operations**: Combine multiple API calls when possible
- **Caching**: Cache frequently accessed document metadata
- **Pagination**: Handle large file lists efficiently
- **Connection Pooling**: Reuse HTTP connections for multiple requests