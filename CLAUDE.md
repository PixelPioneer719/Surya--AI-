# SURYA AI - Core Directives & Architecture Guide

## Project Identity
**Surya AI** is a premium AGI OS built by PVS Hariharan (7th grade student, Bhashyam School, Bhimavaram, India). It combines a Gemini-style chat interface with an Emergent.ai-style split-screen Canvas IDE, providing a complete AI-powered development environment.

**Live URL:** Deployed on Render.com  
**Tech Stack:** Node.js backend + Vanilla JS frontend (single-page app)  
**License:** ISC  
**Version:** 2.0.0 (Canvas IDE in active development)

## Quick Start Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm start
# or
node server.js

# Open in browser
# http://localhost:3000
```

### Testing
```bash
# Manual testing (primary method)
# 1. Start server: npm start
# 2. Open http://localhost:3000 in browser
# 3. Test features manually in browser console
# 4. Check server logs for errors

# Check server health
curl http://localhost:3000/health

# Test API endpoints
curl -X POST http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Build & Deployment
```bash
# Production build (if using Vite)
npm run build

# Deploy to Render.com
git push origin main
# Render auto-deploys on push
```

## Architecture Source of Truth

### System Overview
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser SPA   │────▶│  Node.js Server  │────▶│  External APIs  │
│  (Vanilla JS)   │◀────│  (HTTP Server)   │◀────│  (InsForge, etc) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       │                        │                        │
       │                        ├────▶ JSON File Storage │
       │                        ├────▶ Google APIs       │
       │                        ├────▶ Stable Horde      │
       │                        └────▶ Gmail SMTP        │
       │
       └────▶ WebContainers (Canvas IDE)
```

### Core Technologies
- **Backend**: Native Node.js HTTP server (no Express)
- **Frontend**: Vanilla JavaScript SPA
- **Canvas Runtime**: StackBlitz WebContainers
- **AI Gateway**: InsForge SDK
- **Storage**: JSON files (users.json, chats.json)
- **Authentication**: PBKDF2 + bearer tokens

### Design System
- **Typography**: Inter, SF Pro Display, or system-ui
- **Spacing**: Strict 8px grid (8, 16, 24, 32, 48px)
- **Colors**: CSS custom properties with dark/light themes
- **Animations**: `transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1)`
- **Borders**: Subtle `1px solid rgba(0,0,0,0.05)` with 12px radius

## Current Project Phase: Supabase Auto-Provisioning

### Phase 1 Goals (IN PROGRESS)
- [x] Add Settings → Connectors → Supabase
- [x] Backend endpoint `POST /api/integrations/supabase/provision`
- [x] AI outputs `database_schema.sql` in Canvas bundles
- [x] CanvasEngine injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [x] AI uses `@supabase/supabase-js` in generated packages

### Next Phase: GitHub Deployment (Q2 2026)
- [ ] Refactor GitHub OAuth to store tokens per-user
- [ ] Action Approval Modal: Apple-style blur modal
- [ ] Canvas Agent outputs `"action": "deploy_github"` flag
- [ ] Backend `POST /api/execute-action` creates GitHub repo
- [ ] Settings → Connectors → GitHub connect/disconnect

## Key Architecture Rules

### Backend Rules
- **No Express**: Use native Node.js HTTP server only
- **Custom Routing**: Manual URL parsing and route handling
- **Security**: All API keys server-side, never exposed to client
- **Error Handling**: Global exception handlers and graceful failures
- **Performance**: Request timeouts, rate limiting, input validation

### Frontend Rules
- **Vanilla JS**: No React, Vue, or heavy frameworks
- **Modular Structure**: Separate JS and CSS files
- **Single Page App**: No page refreshes, client-side routing
- **Progressive Enhancement**: Works without JavaScript (basic functionality)
- **Accessibility**: WCAG 2.1 AA compliance

### Canvas IDE Rules
- **WebContainer Only**: Real Node.js execution in browser
- **Vite + Tailwind**: Enforced tech stack for generated projects
- **Cross-Origin Isolation**: COOP + COEP headers required
- **Secure Context**: HTTPS or localhost for SharedArrayBuffer
- **Project Isolation**: Each canvas project in separate container

### Security Rules
- **Password Hashing**: PBKDF2 with 10,000 iterations, SHA-512, 16-byte salt
- **Token Security**: 48-byte cryptographically secure tokens
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: 100 requests/minute per IP, stricter for auth
- **Data Encryption**: OAuth tokens encrypted at rest

## API Architecture

### Authentication Flow
```
User Login → OTP Email → Verification → Bearer Token → Protected Routes
```

### AI Routing Logic
```
User Input
├── Has active tool selected? → Use that tool's route
├── Has file attached? → Detect file type (code/image/document)
├── Contains image keywords? → Stable Horde API
├── Contains code keywords? → Claude Opus 4.6
├── Contains search keywords? → Grok 4.1 Fast
├── Contains workspace keywords? → Google Workspace APIs
└── Default → Claude Opus 4.6 (general chat)
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

## Environment Configuration

### Required Environment Variables
```bash
# InsForge AI API
INSFORGE_API_KEY=your-insforge-api-key
INSFORGE_BASE=https://rme548ii.ap-southeast.insforge.app

# Google OAuth + Workspace
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (Phase 2)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Gmail SMTP for OTP
SMTP_EMAIL=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password

# Server
PORT=3000
```

### Development Setup
1. Copy `.env.example` to `.env`
2. Fill in all required API keys
3. Set up Google OAuth redirect URIs
4. Enable Gmail 2FA and generate App Password
5. Run `npm install && npm start`

## File Structure Standards

### Root Directory
```
surya-ai/
├── .clauderules          # Global behavior rules
├── CLAUDE.md             # This file - project brain
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
├── server.js             # Main HTTP server
├── agent.js              # AI agent task planner
├── render.yaml           # Render.com deployment config
└── README.md             # User-facing documentation
```

### Frontend Structure
```
frontend/
├── index.html           # Main HTML (653 lines)
├── css/
│   ├── variables.css    # Theme variables
│   ├── layout.css       # Layout styles
│   └── components.css   # Component styles
└── js/
    ├── main.js          # App initialization
    ├── api.js           # API communication
    ├── canvas.js        # Canvas IDE logic
    └── memory.js        # Data management
```

### Backend Structure
```
backend/                 # (Planned modularization)
├── routes/              # API route handlers
└── middleware/          # Request processing
```

### Data Storage
```
data/
├── users.json           # User accounts and auth
└── chats.json           # Conversation history
```

## Development Workflow

### Code Changes
1. **Frontend**: Edit modular files in `frontend/`
2. **Backend**: Modify `server.js` or create new route handlers
3. **Testing**: Manual browser testing, check console logs
4. **Documentation**: Update relevant docs for architecture changes

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
# Make changes...
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Main branch (auto-deploys to Render)
git checkout main
git merge feature/new-feature
git push origin main
```

### Quality Checks
- **Security**: Never commit API keys or sensitive data
- **Performance**: Test load times, bundle size under 500KB
- **Accessibility**: Keyboard navigation, screen reader support
- **Cross-browser**: Test in Chrome, Firefox, Safari

## Troubleshooting Guide

### Common Issues
- **Server won't start**: Check port 3000 availability, Node.js version
- **Authentication fails**: Verify SMTP credentials, check spam folder
- **Canvas not loading**: Ensure HTTPS/localhost, check COOP/COEP headers
- **API errors**: Check InsForge/Google API keys and network connectivity

### Debug Commands
```bash
# Check Node.js version
node --version

# Check port usage
lsof -i :3000

# Test API health
curl http://localhost:3000/health

# View server logs
tail -f logs/server.log
```

## Key Contacts & Resources

### Project Author
**PVS Hariharan** - 7th Grade Student, Bhashyam School, Bhimavaram, India

### External Services
- **InsForge**: AI API gateway (rme548ii.ap-southeast.insforge.app)
- **Stable Horde**: Image generation (stablehorde.net)
- **Google Cloud**: OAuth and Workspace APIs
- **Render.com**: Hosting and deployment

### Documentation Links
- **API Reference**: See docs/api/ directory
- **Architecture Deep-dives**: See docs/arch/ directory
- **Roadmap**: See docs/roadmap/ directory

---

*This document serves as the "brain" of Surya AI. All architectural decisions and development guidelines flow from these core directives. Update this file when making significant changes to the project structure or technology choices.*
| POST | `/api/auth/sign-out` | Logout |
| DELETE | `/api/auth/delete-account` | Delete user account |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/chats/save` | Save chat history |
| GET | `/api/chats/load` | Load chat history |
| GET | `/api/agent?task=` | AI agent task planning (SSE) |
| GET | `/api/image?prompt=` | Submit image generation job (Stable Horde) |
| GET | `/api/image-status?id=` | Poll image job status |
| POST | `/api/connectors/google-workspace/start` | Start Google Workspace OAuth |
| GET | `/api/connectors/google-workspace/status` | Check workspace connection status |
| POST | `/api/connectors/google-workspace/disconnect` | Disconnect workspace |
| GET | `/api/google-workspace/drive/files` | List Google Drive files |
| GET | `/api/google-workspace/docs/:id` | Read a Google Doc |
| GET | `/api/google-workspace/slides/:id` | Read a Google Slides presentation |
| POST | `/api/google-workspace/docs/create` | Create a Google Doc |
| POST | `/api/google-workspace/slides/create` | Create a Google Slides presentation |
| POST | `/api/google-workspace/sheets/create` | Create a Google Sheet |
| GET | `/api/google-workspace/query?prompt=` | Smart query (auto-routes to files/docs/slides) |

## Key Architecture Decisions
- **Single HTML file:** All CSS and JS embedded in `frontend/index.html` for simplicity
- **No framework:** Vanilla JS for zero build step and maximum control
- **InsForge API:** All AI model calls route through InsForge's gateway (server-side proxy at `/api/ai/chat/completion`)
- **Auth is optional:** App opens directly to chat; users can login from sidebar
- **Dual account model:** Adult flow uses Google OAuth + email OTP; Child flow uses name + DOB + password
- **Canvas uses WebContainers:** Real Node.js execution in browser, not Blob URL hacks
- **Cross-Origin Isolation:** COOP + COEP headers on all routes for WebContainer compatibility
- **Agent planning only:** Server plans steps via SSE, frontend executes with `window.open()`
- **Auto-routing:** Regex patterns detect image/code/search/workspace/canvas intent
- **Google Workspace:** Connected via Settings → Connectors; auto-detected in chat
- **Server stability:** `parseBody()` has 10MB limit, `writeChats()` has try-catch, global error handlers
- **Frontend dist:** Server prefers `frontend/dist/index.html` if it exists

## Current Auth UX (Apr 2026)
- On first load, Surya AI opens directly to chat (no forced auth)
- Sidebar includes a Login button when logged out
- Account types: Adult (Google OAuth / email OTP) and Child (name + DOB + password)
- Guest chats stored under `surya_conversations_guest`

## Google Workspace Integration
- Connected via **Settings → Connectors → Google Workspace**
- OAuth scopes: `drive.readonly`, `documents`, `presentations`, `spreadsheets`
- Auto-detection in chat for create/read/list actions

## InsForge Configuration
- **Project ID:** rme548ii
- **Region:** ap-southeast
- **API Base:** `https://rme548ii.ap-southeast.insforge.app`
- **Models:** Claude Opus 4.6 (Pro/Code), Gemini 3.1 Pro (Creative), Grok 4.1 (Search)

## Environment Variables (`.env`)
```
INSFORGE_API_KEY=          # InsForge API key
INSFORGE_BASE=             # InsForge base URL
GOOGLE_CLIENT_ID=          # Google OAuth client ID
GOOGLE_CLIENT_SECRET=      # Google OAuth client secret
GITHUB_CLIENT_ID=          # GitHub OAuth client ID
GITHUB_CLIENT_SECRET=      # GitHub OAuth client secret
SMTP_EMAIL=                # Gmail address for sending OTP emails
SMTP_PASS=                 # Gmail App Password (requires 2FA)
PORT=                      # HTTP listen port (default: 3000)
```

## Running Locally
```bash
npm install
node server.js
# Open http://localhost:3000
```

## Important Notes
- After editing `frontend/index.html`, copy it to `frontend/dist/index.html`
- WebContainers require Cross-Origin Isolation headers (already set in server.js)
- WebContainers require localhost (secure context) or HTTPS for local dev
- InsForge project is on Free plan (may be paused)
- Google OAuth requires credentials registered at Google Cloud Console
- Gmail SMTP uses App Password (2FA required)
- `maxTokens` parameter in InsForge API uses camelCase
- Deployment via `render.yaml` for Render.com (persistent disk at `/opt/render/project/src/data`)

## Roadmap — What's Next

surya-ai/
│
├── .agent/                             # 🧠 The AI Brain & System Prompts
│   ├── rules/
│   │   ├── 01-ui-ux-standards.md       # Apple/Gemini Vanilla UI rules
│   │   ├── 02-brain-and-memory.md      # Traffic Cop & JSON memory rules
│   │   ├── 03-accounts-security.md     # Rate limits & custom auth logic
│   │   ├── 04-databases-storage.md     # InsForge vs. Supabase separation
│   │   └── 05-extra-superpowers.md     # n8n Agent mode & GWS logic
│   └── templates/                      # Standard JSON outputs for the AI
│       └── n8n-webhook-payload.json
│
├── data/                               # 🗄️ Native Local Database (Rule 03 & 04)
│   ├── users.json                      # User credentials, limits, and GWS tokens
│   ├── chats.json                      # Saved conversations
│   └── limits.json                     # Temporary daily rate-limit tracking
│
├── backend/                            # ⚙️ Native Node.js Server (No Express)
│   ├── server.js                       # HTTP server entry point (`http.createServer`)
│   ├── router.js                       # Custom route dispatcher
│   ├── auth/
│   │   └── crypto.js                   # PBKDF2 hashing and token generation
│   ├── ai/
│   │   ├── traffic-cop.js              # Intent detection & model routing
│   │   ├── insforge-client.js          # Calls to Claude 4.6, Gemini 3.1, Grok
│   │   └── memory-manager.js           # Reads/Writes to data/users.json
│   ├── canvas/
│   │   ├── supabase-provision.js       # Generates database_schema.sql (Rule 04)
│   │   └── bundle-generator.js         # Creates Vite/React files for WebContainers
│   └── superpowers/
│       ├── workspace-api.js            # Google Docs/Sheets OAuth and execution
│       └── n8n-bridge.js               # Sends JSON commands to Open Claw/n8n
│
├── frontend/                           # 🎨 Vanilla JS UI (Rule 01)
│   ├── index.html                      # Clean, minimal DOM structure
│   ├── css/
│   │   ├── variables.css               # Deep Orange, Apple easing, glassmorphism
│   │   ├── layout.css                  # Chat vs. 30/70 Canvas split grid
│   │   └── animations.css              # Smooth transitions and 3D preview effects
│   ├── js/
│   │   ├── main.js                     # App initialization
│   │   ├── ui-controller.js            # Handles the smooth sliding Canvas panel
│   │   ├── api-client.js               # Fetches data from native Node backend
│   │   └── canvas-engine.js            # WebContainer boot and terminal logic
│   └── assets/                         # Icons and logos (Prabhas/Surya themes)
│
├── canvas-blueprints/                  # 🏗️ AI Starting Points for User Apps
│   └── vite-react-supabase/            # Base files injected into WebContainers
│       ├── package.json
│       └── main.jsx
│
├── .env                                # 🔐 Secrets (InsForge, Supabase, Google)
├── package.json                        # Node dependencies (WebContainer API, etc.)
└── CLAUDE.md                           # 🧭 The Master Guide for the AI

Here is the step-by-step execution roadmap to bring Surya AI from these architectural rules into a fully functional, production-ready system.

Since we have established a strict "Vanilla JS + Native Node.js" rule and mapped out the exact folder structure, this roadmap focuses on the exact order in which you should write the code so that you never have to rewrite core logic later.

### Phase 1: The Native Foundation (Backend Engine)
Goal: Get the server running and routing traffic without Express.

Step 1: Core Server Setup (backend/server.js)
- Initialize the native http.createServer.
- Write the MIME-type handler to serve static files (HTML, CSS, JS) from the frontend/ directory.
- Implement the parseBody utility to handle incoming JSON requests safely (enforcing the 1MB limit).

Step 2: Custom Router (backend/router.js)
- Build the if/else logic to intercept /api/... routes and pass them to the correct backend controllers.

Step 3: Storage Utilities
- Create the atomic read/write functions for data/users.json and data/chats.json to ensure data doesn't corrupt.

### Phase 2: Identity & Security
Goal: Secure the system and set up rate limits before connecting expensive AI models.

Step 1: Cryptography (backend/auth/crypto.js)
- Implement the PBKDF2 hashing logic for passwords.
- Create the secure 48-character Bearer token generator for sessions.

Step 2: Authentication Flow
- Build the Sign-Up/Sign-In API endpoints.
- Implement the Nodemailer integration for the OTP email verification.

Step 3: The Rate Limiter
- Code the logic to enforce the 5-message (Guest) and 50-message (Logged-in) daily limits using an in-memory Map or limits.json.

### Phase 3: The Apple-Tier UI Shell
Goal: Build the responsive, framework-free frontend and the sliding Canvas mechanism.

Step 1: CSS Architecture
- Define all CSS variables in variables.css (Deep Orange accent, glassmorphism specs).
- Implement the cubic-bezier(0.16, 1, 0.3, 1) easing for all transitions.

Step 2: Layout & Interactions
- Build the centered Chat UI with auto-scrolling message bubbles.
- Code the ui-controller.js logic to smoothly slide the UI into the 30/70 split when the Canvas IDE opens.

Step 3: State Management (js/memory.js)
- Write the client-side logic to store the session token and cache recent messages.

### Phase 4: The AI Brain & Routing
Goal: Connect the InsForge models and make Surya AI "think."

Step 1: The Traffic Cop (backend/ai/traffic-cop.js)
- Write the intent-detection logic (Regex or a lightweight LLM call) to route requests to Claude, Gemini, or Grok.

Step 2: InsForge Client
- Build the HTTP fetch logic to send prompts to the InsForge API.
- Implement Server-Sent Events (SSE) so the text streams back to the frontend character-by-character.

Step 3: Context Loading
- Write the logic that reads the correct .agent/rules/ file and injects it into the system prompt based on the Traffic Cop's decision.

### Phase 5: The Canvas IDE (The App Builder)
Goal: Enable the in-browser sandbox for generating React/Vite apps.

Step 1: WebContainer Booting (frontend/js/canvas-engine.js)
- Import @webcontainer/api and set up the necessary Cross-Origin Isolation headers on your Node.js server.

Step 2: App Blueprints
- Create the default package.json and main.jsx templates inside the canvas-blueprints/ folder.

Step 3: The Generation Loop
- Instruct Claude 4.6 to output code strictly in the JSON format needed to populate the WebContainer files and run npm run dev.

### Phase 6: Superpowers & Supabase
Goal: Give the AI access to the internet and isolated databases.

Step 1: Supabase Auto-Provisioning (Your immediate next goal)
- Write backend/canvas/supabase-provision.js to generate the database_schema.sql and inject the RLS policies.

Step 2: Google Workspace OAuth
- Set up the OAuth consent screen and save the accessToken into the users.json file.

Step 3: n8n Agent Mode
- Build the webhook bridge to forward structured JSON commands to your external n8n/Open Claw setup.

Based on .md files
