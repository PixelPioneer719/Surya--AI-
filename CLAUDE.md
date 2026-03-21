# Surya AI — Project Guide

## Overview
Surya AI is a production-grade AI chatbot startup built by PVS Hariharan (7th class student, Bhashyam School, Bhimavaram, India). It provides AI chat, image generation, web search, code assistance, and browser automation.

## Tech Stack
- **Backend:** Node.js (native HTTP server, no framework)
- **Frontend:** Vanilla HTML/CSS/JS single-page app (`frontend/index.html`, ~4900 lines)
- **AI Models:** InsForge API Gateway (Claude Opus 4.6, Gemini, Grok 4.1)
- **Image Gen:** InsForge Gemini (primary), Stable Horde (fallback)
- **Auth:** Google OAuth 2.0 + Email/password with Gmail SMTP verification
- **Database:** JSON file-based (`data/users.json`, `data/chats.json`)
- **Agent:** Playwright-based browser automation planner (`agent.js`)
- **Email:** Nodemailer + Gmail App Password

## Project Structure
```
/
├── server.js              # HTTP server with all API endpoints
├── agent.js               # AI agent task planner (SSE streaming)
├── package.json           # Dependencies (@insforge/sdk, nodemailer, playwright)
├── .env                   # API keys and credentials
├── frontend/
│   ├── index.html         # Complete SPA (HTML + CSS + JS)
│   ├── manifest.json      # PWA manifest
│   ├── robots.txt         # SEO
│   └── sitemap.xml        # SEO
├── data/
│   ├── users.json         # User accounts
│   └── chats.json         # Chat history
└── .claude/
    ├── launch.json        # Dev server config
    ├── SuryaAI_System.md  # AI system prompt
    ├── SuryaAI_AGENT.md   # Agent requirements
    ├── Frontend.md        # Frontend specs
    └── Surya_Backend.md   # Backend specs
```

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/google` | Google OAuth initiation |
| GET | `/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/sign-up` | Email signup (sends OTP) |
| POST | `/api/auth/verify` | Verify OTP and create account |
| POST | `/api/auth/resend-code` | Resend verification code |
| POST | `/api/auth/sign-in` | Email/password login |
| POST | `/api/auth/sign-out` | Logout |
| DELETE | `/api/auth/delete-account` | Delete user account |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/chats/save` | Save chat history |
| GET | `/api/chats/load` | Load chat history |
| GET | `/api/agent?task=` | AI agent task planning (SSE) |
| GET | `/api/image?prompt=` | Submit image generation job |
| GET | `/api/image-status?id=` | Poll image job status |

## Key Architecture Decisions
- **Single HTML file:** All CSS and JS embedded in `frontend/index.html` for simplicity
- **No framework:** Vanilla JS for zero build step and maximum control
- **InsForge API:** All AI model calls route through InsForge's gateway
- **Dual auth:** InsForge auth (primary) with local server fallback
- **Agent planning only:** Server plans steps, frontend executes (macOS `open` command for navigation)
- **Auto-routing:** Regex patterns detect image/code/search intent without user clicking Tools

## InsForge Configuration
- **Project ID:** rme548ii
- **Region:** ap-southeast
- **API Base:** `https://rme548ii.ap-southeast.insforge.app`
- **Models Used:**
  - `anthropic/claude-opus-4.6` — Pro + Code tasks
  - `google/gemini-3.1-pro-preview` — Creative tasks
  - `x-ai/grok-4.1-fast` — Web search (has real-time data)
  - `google/gemini-2.0-flash-exp` — Image generation

## Running Locally
```bash
npm install
node server.js
# Open http://localhost:3000
```

## Important Notes
- InsForge project is on Free plan (may be paused). Tony from InsForge is helping upgrade to Pro.
- Google OAuth requires credentials registered at Google Cloud Console
- Gmail SMTP uses App Password (2FA required on the Gmail account)
- The `maxTokens` parameter in InsForge API uses camelCase (not snake_case)
- Stream format from InsForge: chunks contain `{chunk}` or `{content}` fields
