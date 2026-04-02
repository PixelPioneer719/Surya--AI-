# Surya AI

**Free AI Assistant + Canvas IDE — Build, Preview & Deploy Apps from Chat**

Built by **PVS Hariharan** | Powered by [InsForge](https://insforge.com)

---

## Features

| Feature | Description |
|---------|-------------|
| **Canvas IDE** | Lovable-style in-browser app builder with WebContainers — generates full apps from prompts |
| **AI Chat** | Multi-model chat powered by Claude Opus 4.6, Gemini, and Grok with auto-routing |
| **Image Generation** | Create images from text using Stable Horde |
| **Web Search** | Real-time web search with Grok 4.1 |
| **Code Assistant** | Expert coding help with syntax highlighting and code preview |
| **AI Agent** | Autonomous task planner that executes multi-step browser workflows |
| **Google Workspace** | Create and read Google Docs, Slides, and Sheets directly from chat |
| **File Upload** | Upload images and documents for AI analysis |
| **Dark/Light Theme** | Toggle from Settings |
| **Cross-device Sync** | Chat history synced across devices when logged in |
| **PWA** | Installable as a Progressive Web App |

## Canvas IDE — How It Works

Surya AI Canvas is a Lovable/Replit-style app builder powered by **StackBlitz WebContainers**:

1. Select the **Canvas** tool and describe what you want to build
2. For vague prompts, the AI asks clarifying questions first (Product Manager mode)
3. For detailed specs, the AI generates a complete Vite + Tailwind project as JSON
4. Code is mounted into a **WebContainer** (real Node.js in the browser)
5. `npm install` → `npm run dev` runs in a terminal pane you can see
6. Live preview appears in the right panel iframe
7. Click **"Open Workspace"** in chat history to reopen any past project

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js native HTTP server |
| Frontend | Vanilla HTML/CSS/JS (single-page app) |
| Canvas Runtime | StackBlitz WebContainers (@webcontainer/api) |
| AI Models | InsForge Gateway (Claude Opus 4.6, Gemini 3.1 Pro, Grok 4.1) |
| Image Gen | Stable Horde |
| Auth | Google OAuth + Email OTP + Child accounts |
| Google Workspace | OAuth2 (Docs, Slides, Sheets, Drive) |
| Database | JSON file-based storage |
| Deployment | Render.com |

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Google Cloud Console project (for OAuth)
- InsForge API key
- Gmail account with App Password (for email OTP)

### Setup

```bash
git clone https://github.com/PixelPioneer719/Surya--AI-.git
cd Surya--AI-

npm install

cp .env.example .env
# Edit .env with your API keys

npm start
```

Open `http://localhost:3000` in your browser.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `INSFORGE_API_KEY` | InsForge API key |
| `INSFORGE_BASE` | InsForge base URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `SMTP_EMAIL` | Gmail address for sending OTP emails |
| `SMTP_PASS` | Gmail App Password (2FA required) |
| `PORT` | Server port (default: 3000) |

## Project Structure

```
surya-ai/
├── server.js              # HTTP server + all API endpoints
├── agent.js               # AI agent task planner (SSE)
├── Surya_AI_Canvas.md     # Canvas AI system prompt (Mode 1/Mode 2)
├── PRODUCT_SPEC.md        # Full product specification
├── CLAUDE.md              # Developer guide & roadmap
├── package.json           # Dependencies
├── render.yaml            # Render.com deployment config
├── .env.example           # Environment variable template
├── frontend/
│   ├── index.html         # Complete SPA (HTML + CSS + JS)
│   ├── dist/              # Served version of frontend
│   ├── manifest.json      # PWA manifest
│   ├── robots.txt         # SEO
│   └── sitemap.xml        # SEO
└── data/
    ├── users.json         # User accounts
    └── chats.json         # Chat history
```

## Auto-Routing

Surya AI automatically detects user intent:
- **Canvas** ("build an app", "create a website") → WebContainer IDE
- **Image** ("draw", "generate image") → Stable Horde
- **Code** ("write code", "function") → Claude Opus 4.6
- **Web search** ("latest news", "current price") → Grok 4.1
- **Google Workspace** ("create a doc", "show my drive files") → Google APIs
- **General chat** → Claude Opus 4.6

## Roadmap

- [ ] **Supabase Integration** — Auto-provision PostgreSQL databases for Canvas apps
- [ ] **GitHub Deployment** — Push Canvas projects to GitHub with approval flow
- [ ] **Vercel/Netlify Deploy** — One-click deploy from Canvas
- [ ] **Iterative Editing** — Modify running Canvas apps via follow-up prompts
- [ ] **Canvas File Explorer** — Browse and edit individual files in code view

## Deployment

Configured for [Render.com](https://render.com) via `render.yaml`:
- Free tier web service
- 1GB persistent disk for data storage
- Cross-Origin Isolation headers enabled (required for WebContainers)

## License

ISC

## Author

**PVS Hariharan** — 7th class student, Bhashyam School, Bhimavaram, India
