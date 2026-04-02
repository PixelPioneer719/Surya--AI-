# Surya AI — Project Guide

## Overview
Surya AI is a production-grade AI chatbot and Canvas IDE startup built by PVS Hariharan (7th class student, Bhashyam School, Bhimavaram, India). It provides AI chat, Canvas (in-browser app builder with WebContainers), image generation, web search, code assistance, Google Workspace integration, and an autonomous AI agent.

## Tech Stack
- **Backend:** Node.js (native HTTP server, no framework)
- **Frontend:** Vanilla HTML/CSS/JS single-page app (`frontend/index.html`, ~6,100+ lines)
- **Canvas IDE:** StackBlitz WebContainers (@webcontainer/api) for in-browser app execution
- **AI Models:** InsForge API Gateway (Claude Opus 4.6, Gemini, Grok 4.1)
- **Image Gen:** Stable Horde (free, open image generation network)
- **Auth:** Optional login with Adult and Child account types
- **Database:** JSON file-based (`data/users.json`, `data/chats.json`)
- **Agent:** SSE-based task planner (`agent.js`) — server generates steps, frontend executes via `window.open()`
- **Google Workspace:** OAuth2 integration for Docs, Slides, Sheets (read + create)
- **Email:** Nodemailer + Gmail App Password

## Project Structure
```
/
├── server.js              # HTTP server with all API endpoints (~1,700 lines)
├── agent.js               # AI agent task planner (SSE streaming)
├── Surya_AI_Canvas.md     # Canvas system prompt (Mode 1/Mode 2 conditional logic)
├── package.json           # Dependencies (@insforge/sdk, nodemailer, dotenv)
├── render.yaml            # Render.com deployment config
├── .env                   # API keys and credentials (not committed)
├── .env.example           # Environment variable template
├── PRODUCT_SPEC.md        # Full product specification document
├── README.md              # Project README
├── frontend/
│   ├── index.html         # Complete SPA (HTML + CSS + JS, ~6,100+ lines)
│   ├── dist/              # Built/served version of frontend (server serves this)
│   ├── manifest.json      # PWA manifest
│   ├── robots.txt         # SEO
│   └── sitemap.xml        # SEO
├── data/
│   ├── users.json         # User accounts
│   └── chats.json         # Chat history
└── .claude/
    └── settings.json      # Claude Code settings
```

## Canvas Architecture (WebContainers)

### How It Works
1. User selects "Canvas" tool and describes an app
2. AI uses `Surya_AI_Canvas.md` system prompt with **two modes**:
   - **Mode 1 (Product Manager):** For vague requests → asks 2-3 clarifying questions as plain text
   - **Mode 2 (Engineer):** For detailed specs → outputs JSON bundle with `{plan, files, commands}`
3. Frontend detects JSON vs text via `looksLikeCanvasJson()` 
4. JSON bundles are mounted into a **StackBlitz WebContainer** (in-browser Node.js)
5. WebContainer runs `npm install` → `npm run dev` → fires `server-ready` event
6. Live preview loads in the right-panel iframe from the WebContainer's dev server URL
7. Terminal pane shows real-time `stdout` from npm install/dev processes

### Key Components
- **CanvasEngine** object: `boot()`, `mountAndRun(bundle)`, `convertBundleToTree()`, `teardown()`
- **WebContainer API:** `@webcontainer/api@1.1.9` loaded via CDN
- **Cross-Origin Isolation:** `COOP: same-origin` + `COEP: require-corp` headers on all routes (required for SharedArrayBuffer)
- **Split Panel:** Left 35% = chat, Right 65% = preview iframe + terminal pane + code view
- **Re-entry Cards:** Chat history shows "Open Workspace" button to reopen past projects

### Canvas System Prompt (`Surya_AI_Canvas.md`)
- Mode 1: Conversational questions for vague prompts (no JSON output)
- Mode 2: Pure JSON with Tailwind CSS, Google Fonts, Lucide Icons, dark mode by default
- AI outputs: `{plan, files: {"index.html": {file: {contents: "..."}}, ...}, commands: ["npm install", "npm run dev"]}`
- Enforces Vite + Tailwind stack, responsive design, modern UI patterns

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/chat/completion` | InsForge proxy (streaming) |
| GET | `/api/canvas/prompt` | Get Canvas system prompt |
| GET | `/auth/google` | Google OAuth initiation |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/github` | GitHub OAuth initiation |
| GET | `/auth/github/callback` | GitHub OAuth callback |
| POST | `/api/auth/sign-up` | Email signup (sends OTP) |
| POST | `/api/auth/verify` | Verify OTP and create account |
| POST | `/api/auth/resend-code` | Resend verification code |
| POST | `/api/auth/sign-in` | Email/password login |
| POST | `/api/auth/child/sign-up` | Child signup (name + DOB + password) |
| POST | `/api/auth/child/sign-in` | Child signin (name + DOB + password) |
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

### Phase 1: Supabase Auto-Provisioning (NEXT)
- Add Settings → Connectors → Supabase (API key input, not OAuth)
- Backend endpoint `POST /api/integrations/supabase/provision` to create databases
- AI outputs `database_schema.sql` in Canvas bundles when persistence is needed
- CanvasEngine injects `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as `.env` in WebContainer
- AI uses `@supabase/supabase-js` in generated `package.json`

### Phase 2: GitHub Deployment (Permission Gateway)
- Refactor GitHub OAuth to store tokens per-user in `users.json`
- Action Approval Modal: Apple-style blur modal for confirming deploys
- Canvas Agent outputs `"action": "deploy_github"` flag when user asks to deploy
- Backend `POST /api/execute-action` creates GitHub repo + pushes files
- Settings → Connectors → GitHub connect/disconnect

### Phase 3: Polish & Scale
- Iterative Canvas editing (modify running app via follow-up prompts)
- Canvas file explorer in code view mode
- Vercel/Netlify deployment integration
- Paid tier with higher rate limits
