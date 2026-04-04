# Rule: Extra Superpowers & Agentic Actions

**Context**: This document governs how Surya AI interacts with the outside world beyond simple chat. It covers personal data integrations (Google Workspace) and autonomous web execution (AI Agent Mode via n8n / Open Claw).

## 1. Google Workspace (GWS) Integration & Isolation

Surya AI can directly read, write, and manage a user's Google Docs, Sheets, and Calendar. However, strict data isolation is the highest priority.

### User Isolation Protocol:
- **Token Storage**: OAuth access and refresh tokens MUST be stored explicitly inside the specific user's object in `data/users.json` (e.g., `users[userId].googleWorkspace.accessToken`).
- **No Cross-Pollination**: When the AI receives a request to "Read my schedule" or "Create a doc", it must strictly retrieve the OAuth token belonging to the `userId` making the request.
- **Capabilities**: The AI can format document text, create spreadsheet rows, and insert calendar events by hitting the Google REST APIs directly from the Node.js backend.

*AGI Directive: "A user's Google Workspace is their private digital life. I must never mix up credentials. When accessing GWS, I act exclusively on behalf of the authenticated user, respecting their privacy and data boundaries completely."*

## 2. AI Agent Mode (n8n & Open Claw Automation)

Surya AI has an "Agent Mode" where it stops just talking and starts *doing*. Instead of executing heavy web automation directly on the Node.js server, Surya AI acts as the "Brain" and uses n8n / Open Claw as the "Hands."

### The Execution Flow:
1. **Trigger**: User asks for a complex internet action (e.g., "Research top 5 AI news today and post a summary to my Twitter," or "Scrape this website").
2. **JSON Command Output**: The AI formulates a precise, structured JSON command rather than plain text.
3. **Webhook Handoff**: The native Node.js backend sends this JSON payload to an n8n Webhook or the Open Claw API.
4. **Asynchronous Wait**: n8n executes the web automation (browser control, API chaining). Surya AI listens via SSE (Server-Sent Events) or polls for the result to report back to the user.

### Standard JSON Command Format:
When operating in Agent Mode, the AI must structure its intent like this:
```json
{
  "agent_action": "true",
  "workflow_target": "n8n_webhook_or_open_claw",
  "task_type": "web_scrape_and_post",
  "parameters": {
    "url": "https://example.com/news",
    "extraction_goal": "Top 5 headlines",
    "destination": "twitter",
    "user_context": "userId_123"
  }
}
```

*AGI Directive: "I am the orchestrator. For complex web tasks, I do not need to scrape the HTML myself. I must synthesize the user's goal into a perfect JSON command, hand it off to my n8n/Claw automation engine, and monitor the progress to keep the human updated."*

## 3. Security Constraints for Superpowers

### Confirmation Gate
Before executing any n8n workflow that modifies external state (like sending an email or posting to social media), the AI must ask the user for explicit confirmation in the chat UI.

### Scope Limits
GWS OAuth scopes must be requested incrementally. Do not ask for Calendar access if the user only wants to create a Doc.

### Action Auditing
Every agent action must be logged in `data/agent_actions.log` with:
- `timestamp`
- `userId`
- `actionType`
- `workflowTarget`
- `status` (`pending` | `in_progress` | `success` | `failure`)
- `correlationId`

## 4. Google Workspace API Wrappers

### Read Google Calendar
```javascript
async function getUserCalendarEvents(userId, authToken) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (!response.ok) throw new Error('Google Calendar read failed');
  return response.json();
}
```

### Create Google Doc
```javascript
async function createGoogleDoc(userId, authToken, title, content) {
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: title,
      mimeType: 'application/vnd.google-apps.document'
    })
  });

  if (!createResponse.ok) throw new Error('Google Drive create failed');
  const doc = await createResponse.json();

  // Append content
  await fetch(`https://docs.googleapis.com/v1/documents/${doc.id}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
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
  });

  return doc;
}
```

## 5. Agent Workflow Execution in Node.js

### Workflow Dispatch
```javascript
async function dispatchAgentWorkflow(userId, agentPayload) {
  const userStore = await AtomicFileWriter.readJsonSafe('data/users.json', { users: {} });
  const user = userStore.users[userId];
  if (!user) throw new Error('User not found');

  const webhook = process.env.N8N_WEBHOOK_URL;
  const r = await fetch(`${webhook}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      agentPayload,
      session: { ip: user.lastIp, userAgent: user.lastUserAgent }
    })
  });

  if (!r.ok) throw new Error('n8n webhook dispatch failed');
  const result = await r.json();

  // Record in agent action log
  appendAgentActionLog({
    timestamp: new Date().toISOString(),
    userId,
    actionType: agentPayload.task_type,
    workflowTarget: 'n8n',
    status: 'pending',
    correlationId: result.correlationId || nanoid(10)
  });

  return result;
}
```

### SSE Result Streaming
```javascript
async function streamAgentResult(res, correlationId) {
  const sseEndpoint = `${process.env.N8N_STATUS_URL}?id=${correlationId}`;

  const eventSource = new EventSource(sseEndpoint);
  eventSource.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    res.write(`event: update\ndata: ${JSON.stringify(payload)}\n\n`);

    if (payload.status === 'success' || payload.status === 'failure') {
      eventSource.close();
      res.end();
    }
  };

  eventSource.onerror = (err) => {
    res.write(`event: error\ndata: ${JSON.stringify(err)}\n\n`);
    eventSource.close();
    res.end();
  };
}
```

## 6. Confirmation & Safety Check Flow

1. User request is parsed by intent engine.
2. If `agent_action:true` is detected, generate a natural-language confirmation prompt:
   - "I am ready to run an automation workflow that will post to Twitter and read link content. Do you confirm?"
3. User must reply with explicit `yes` or `no`.
4. On `yes`, execute `dispatchAgentWorkflow`; on `no`, abort with user message.

## 7. Risk & Abuse Prevention

- Do not execute more than 3 agent workflows per user per hour.
- Block any workflow that tries to place orders, send money, or modify account credentials without explicit additional authorization.
- Log all external actions for auditing and user transparency.

---

This file is structured for `.agent/features/05-extra-superpowers.md` and provides the definitive rule set for Google Workspace IAM, agentic actions, workflow orchestration with n8n, and strong privacy guardrails.