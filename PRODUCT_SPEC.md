# Surya AI — Product Specification Document

**Version:** 2.0.0
**Date:** April 2, 2026
**Author:** PVS Hariharan
**Status:** Production (Canvas IDE in active development)

---

## 1. Product Overview

**Surya AI** is a free, production-grade AI assistant web application that provides multi-model AI chat, image generation, real-time web search, expert code assistance, Google Workspace integration, and autonomous AI agent capabilities.

**Target Users:** Students, developers, researchers, and general users seeking a free AI assistant.

**Live URL:** Deployed on Render.com
**Tech Stack:** Node.js backend + Vanilla JS frontend (single-page app)

---

## 2. Features

| Feature | Description | AI Model |
|---------|-------------|----------|
| AI Chat | General conversation with Claude Opus 4.6 | `anthropic/claude-opus-4.6` |
| Code Assistant | Expert coding, debugging, architecture | `anthropic/claude-opus-4.6` |
| Image Generation | Text-to-image via Stable Horde | Stable Horde API |
| Web Search | Real-time web search with citations | `x-ai/grok-4.1-fast` |
| AI Agent | Autonomous browser task planner (SSE) | `anthropic/claude-opus-4.6` |
| Google Workspace | Create/read Docs, Slides, Sheets | Google APIs + AI for content |
| File Upload | Analyze images, code files, documents | Claude vision |
| Dark/Light Theme | Toggle from Settings | — |
| Cross-device Sync | Chat history synced when logged in | — |
| PWA | Installable progressive web app | — |

---

## 3. Architecture

### 3.1 System Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser    │────▶│  server.js   │────▶│  InsForge API   │
│  (SPA)       │◀────│  (Node.js)   │◀────│  (Claude/Gemini/ │
│              │     │              │     │   Grok)          │
└──────┬───────┘     └──────┬───────┘     └─────────────────┘
       │                    │
       │                    ├────▶ Google APIs (Workspace)
       │                    ├────▶ Stable Horde (Images)
       │                    ├────▶ Gmail SMTP (OTP)
       │                    └────▶ data/*.json (Storage)
       │
       └────▶ localStorage (offline cache)
```

### 3.2 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js native HTTP server (no Express) |
| Frontend | Vanilla HTML/CSS/JS (~5,557 lines single file) |
| AI Gateway | InsForge SDK |
| Image Gen | Stable Horde v2 API |
| Auth | Google OAuth 2.0 + Email OTP + Child accounts |
| Google Workspace | OAuth2 + Docs/Slides/Sheets/Drive APIs |
| Database | JSON file storage (`data/users.json`, `data/chats.json`) |
| Email | Nodemailer + Gmail SMTP |
| Deployment | Render.com (free tier + 1GB persistent disk) |
| Build | Vite (optional, for production builds) |

### 3.3 Frontend Architecture

Single-page app with no framework. All HTML, CSS, and JS in one file (`frontend/index.html`).

**Key Sections:**
- CSS variables for theming (dark/light)
- 3D animated welcome page with orb + rings
- Auth overlay (email OTP, Google OAuth, child accounts)
- Chat interface with streaming markdown rendering
- Settings modal with Connectors tab
- "+" upload popup and Tools popup
- Auto-routing: regex-based intent detection selects the right handler

---

## 4. AI Models & Routing

### 4.1 Model Registry

| Model Key | InsForge Model ID | Use Case |
|-----------|-------------------|----------|
| `surya-pro` | `anthropic/claude-opus-4.6` | General chat, reasoning |
| `surya-code` | `anthropic/claude-opus-4.6` | Code generation, debugging |
| `surya-creative` | `google/gemini-3.1-pro-preview` | Creative tasks, image prompts |
| `surya-search` | `x-ai/grok-4.1-fast` | Real-time web search |

### 4.2 Auto-Routing Logic

Messages are automatically routed based on content:

```
User message
  ├─ Has active tool selected? → Use that tool's route
  ├─ Has file attached? → detectFileRoute (code/image/document)
  ├─ Matches image keywords? → tool-image (Stable Horde)
  ├─ Matches code keywords? → tool-code (Claude)
  ├─ Matches search keywords? → tool-search (Grok)
  ├─ Matches workspace keywords? → tool-workspace (Google APIs)
  └─ Default → chat (Claude)
```

**Detection patterns:**
- **Image:** "draw", "generate image", "create picture", etc.
- **Code:** "write code", "function", "javascript", "python", etc.
- **Search:** "today", "latest", "news", "current president", year numbers, etc.
- **Workspace:** "create doc/slides/sheet" + "show/list/open drive files" (only when connected)

---

## 5. Authentication

### 5.1 Account Types

| Type | Sign Up | Sign In | Storage Key |
|------|---------|---------|-------------|
| Guest | None | None | `surya_conversations_guest` |
| Adult (Email) | Email + Password + OTP | Email + Password | `surya_conversations_[userId]` |
| Adult (Google) | Google OAuth | Google OAuth | `surya_conversations_[userId]` |
| Child | Name + DOB + Password | Name + DOB + Password | `surya_conversations_[userId]` |

### 5.2 Security

- **Passwords:** PBKDF2 hashing (10,000 iterations, SHA-512, 16-byte salt)
- **Tokens:** 48-byte random bearer tokens
- **OTP:** 6-digit code, 10-minute expiry, Gmail SMTP delivery
- **OAuth:** State tokens for CSRF protection
- **Body limit:** 10MB max request body in `parseBody()`
- **Global handlers:** `uncaughtException` + `unhandledRejection` prevent crashes

---

## 6. API Endpoints

### 6.1 Authentication (8 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/sign-up` | Register with email/password, sends OTP |
| POST | `/api/auth/verify` | Verify OTP, create account |
| POST | `/api/auth/resend-code` | Resend verification code |
| POST | `/api/auth/sign-in` | Login with email/password |
| POST | `/api/auth/child/sign-up` | Child account creation |
| POST | `/api/auth/child/sign-in` | Child account login |
| POST | `/api/auth/sign-out` | Logout |
| DELETE | `/api/auth/delete-account` | Delete account permanently |
| GET | `/api/auth/me` | Get current user profile |

### 6.2 OAuth (4 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/google` | Google OAuth redirect |
| GET | `/auth/google/callback` | Google OAuth callback (login + workspace) |
| GET | `/auth/github` | GitHub OAuth redirect |
| GET | `/auth/github/callback` | GitHub OAuth callback |

### 6.3 Chat & AI (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chats/save` | Save conversation history |
| GET | `/api/chats/load` | Load conversation history |

### 6.4 Image Generation (2 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/image?prompt=` | Submit generation job to Stable Horde |
| GET | `/api/image-status?id=` | Poll job status |

### 6.5 AI Agent (1 endpoint)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agent?task=` | SSE stream of planned task steps |

### 6.6 Google Workspace (10 endpoints)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/connectors/google-workspace/start` | Initiate workspace OAuth |
| GET | `/api/connectors/google-workspace/status` | Check connection status |
| POST | `/api/connectors/google-workspace/disconnect` | Disconnect workspace |
| GET | `/api/google-workspace/drive/files` | List Drive files |
| GET | `/api/google-workspace/docs/:id` | Read a Google Doc |
| GET | `/api/google-workspace/slides/:id` | Read a Slides presentation |
| POST | `/api/google-workspace/docs/create` | Create Google Doc |
| POST | `/api/google-workspace/slides/create` | Create Slides presentation |
| POST | `/api/google-workspace/sheets/create` | Create Google Sheet |
| GET | `/api/google-workspace/query?prompt=` | Smart query (auto-routes) |

---

## 7. Google Workspace Integration

### 7.1 Connection Flow

```
Settings → Connectors → Google Workspace → Connect
  → Google OAuth consent screen (Drive, Docs, Slides, Sheets scopes)
  → Callback stores tokens in user record
  → Status: "Connected — Docs, Slides & Sheets"
```

### 7.2 OAuth Scopes

```
openid, email, profile,
https://www.googleapis.com/auth/drive,
https://www.googleapis.com/auth/documents,
https://www.googleapis.com/auth/presentations,
https://www.googleapis.com/auth/spreadsheets
```

### 7.3 Capabilities

| Action | How It Works |
|--------|-------------|
| List files | Queries Google Drive API v3, shows name + type + link |
| Read doc | Fetches via Docs API v1, extracts text from paragraphs |
| Read slides | Fetches via Slides API v1, extracts text from shapes |
| Create doc | AI generates title + content as JSON → Docs API creates it |
| Create slides | AI generates title + slide content → Slides API creates presentation |
| Create sheet | AI generates title + data grid → Sheets API creates spreadsheet |

### 7.4 Chat Auto-Detection

When Google Workspace is connected, messages matching these patterns auto-route:
- "create a document about..." → Creates Google Doc
- "make a presentation about..." → Creates Google Slides
- "create a spreadsheet with..." → Creates Google Sheet
- "show my drive files" → Lists recent files
- "open my doc [URL]" → Reads and displays content

---

## 8. UI/UX Specification

### 8.1 Theme System

| Variable | Dark | Light |
|----------|------|-------|
| `--bg-primary` | `#0a0a0a` | `#ffffff` |
| `--bg-secondary` | `#141414` | `#f9fafb` |
| `--bg-elevated` | `#262626` | `#ffffff` |
| `--text-primary` | `#ffffff` | `#1a1a1a` |
| `--text-secondary` | `#a8a8a8` | `#6b7280` |
| `--accent` | `#f97316` | `#f97316` |
| `--accent-hover` | `#ea580c` | `#ea580c` |
| `--error` | `#ef4444` | `#ef4444` |
| `--sidebar-bg` | `#0f0f0f` | `#f9fafb` |

### 8.2 Welcome Page

- 3D animated orb with concentric rings
- Staggered word reveal animation
- Feature pills (Chat, Code, Images, Search, Workspace)
- "Start Chatting" CTA with gradient background
- Exit animation: scale(1.1) + fade out

### 8.3 Chat Interface

- Sidebar: logo, new chat button, conversation history, settings
- Top bar: model badge, theme toggle, user menu
- Input area: "+" upload button, Tools popup, send button
- Messages: user (right) and AI (left) bubbles with markdown rendering
- Code blocks: syntax highlighting, copy, download, preview buttons
- Streaming: token-by-token rendering with cursor animation

### 8.4 Settings Modal

| Section | Contents |
|---------|----------|
| Appearance | Theme toggle (Dark/Light) |
| Data | Clear All Chats button |
| Danger Zone | Delete Account (triple confirmation) |
| Connectors | Google Workspace connect/disconnect |
| About | Version, author, powered by |

### 8.5 Input Area

- **"+" Button:** Opens popup with Upload Image + Upload File
- **Tools Button:** Opens popup with Create Image, Web Search, Code, AI Agent
- **Send Button:** Orange when active, disabled when empty
- **Textarea:** Auto-grows, max 200px height

### 8.6 Responsive Design

| Breakpoint | Adaptation |
|------------|------------|
| < 640px | Hidden sidebar, full-width chat, reduced fonts |
| 640-1024px | Collapsible sidebar, adjusted padding |
| > 1024px | Full sidebar, hover effects, optimal spacing |

---

## 9. Data Storage

### 9.1 Users (`data/users.json`)

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "accountType": "adult | child",
  "provider": "google | insforge | child-local",
  "token": "bearer-token",
  "salt": "password-salt",
  "hash": "password-hash",
  "verified": true,
  "googleWorkspace": {
    "connected": true,
    "accessToken": "...",
    "refreshToken": "...",
    "expiryDate": 1234567890,
    "connectedAt": "2026-04-01T..."
  },
  "createdAt": "2026-04-01T..."
}
```

### 9.2 Chats (`data/chats.json`)

```json
{
  "userId": {
    "conversationId": {
      "id": "conv-id",
      "title": "Chat Title",
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

---

## 10. External Integrations

| Service | Purpose | API |
|---------|---------|-----|
| InsForge | AI models (Claude, Gemini, Grok) | `rme548ii.ap-southeast.insforge.app` |
| Google OAuth 2.0 | User auth + Workspace auth | `accounts.google.com` |
| Google Docs API | Create/read documents | `docs.googleapis.com/v1` |
| Google Slides API | Create/read presentations | `slides.googleapis.com/v1` |
| Google Sheets API | Create spreadsheets | `sheets.googleapis.com/v4` |
| Google Drive API | List/search files | `www.googleapis.com/drive/v3` |
| Stable Horde | Image generation | `stablehorde.net/api/v2` |
| Gmail SMTP | OTP email delivery | `smtp.gmail.com` |
| GitHub OAuth | Developer auth | `github.com` |

---

## 11. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INSFORGE_API_KEY` | Yes | InsForge API key |
| `INSFORGE_BASE` | Yes | InsForge base URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `SMTP_EMAIL` | Yes | Gmail for sending OTP |
| `SMTP_PASS` | Yes | Gmail App Password |
| `PORT` | No | Server port (default: 3000) |

---

## 12. Deployment

**Platform:** Render.com (free tier)
**Build:** `npm install`
**Start:** `node server.js`
**Storage:** 1GB persistent disk at `/opt/render/project/src/data`

### Production Checklist
- [ ] All environment variables set in Render dashboard
- [ ] Google OAuth redirect URIs configured for production domain
- [ ] Google OAuth app verification submitted (for Workspace scopes)
- [ ] `frontend/dist/index.html` is up to date
- [ ] `data/` directory exists with write permissions

---

## 13. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| JSON file storage | Not scalable beyond ~10K users | Migrate to PostgreSQL |
| In-memory OTP storage | Lost on server restart | Use Redis |
| InsForge free plan | May be paused | Upgrade to Pro |
| Google OAuth unverified | Shows warning screen | Submit for verification |
| Stable Horde queue | Image gen can be slow (30-120s) | Show progress indicator |
| Single server | No horizontal scaling | Add load balancer |
| 10MB upload limit | Large files rejected | Increase or chunk uploads |

---

## 14. Future Roadmap

- [ ] PostgreSQL database migration
- [ ] Redis for sessions and caching
- [ ] Voice input/output (speech-to-text, TTS)
- [ ] Multi-language support
- [ ] Plugin/extension system
- [ ] Team/organization accounts
- [ ] API key management for developers
- [ ] Usage analytics dashboard
- [ ] Rate limiting per user
- [ ] WebSocket for real-time collaboration

---

*Document generated on April 1, 2026*
*Surya AI v1.0 — Created by PVS Hariharan*
