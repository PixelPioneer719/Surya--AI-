# Surya AI — Skills & Technologies Used

## Frontend Skills
| Skill | Usage |
|-------|-------|
| **HTML5** | Semantic markup, SEO meta tags, Open Graph, JSON-LD structured data |
| **CSS3** | Custom properties, flexbox, grid, gradients, animations, transitions, backdrop-filter, clamp(), media queries, dark/light themes |
| **Vanilla JavaScript** | DOM manipulation, fetch API, async/await, SSE (Server-Sent Events), Web Speech API (TTS), Canvas API, sessionStorage/localStorage, URL handling |
| **3D CSS Animations** | Rotating orb with rings using `transform-style: preserve-3d`, `perspective`, keyframe animations |
| **Canvas Particle System** | Interactive particle network with mouse repulsion, connection lines, gradient backgrounds |
| **PWA** | Web app manifest, installable app, mobile-optimized meta tags |
| **Responsive Design** | Mobile-first approach, media queries, clamp() for fluid typography |
| **Markdown Rendering** | marked.js library for parsing AI responses |
| **Syntax Highlighting** | highlight.js for code blocks in AI responses |
| **SEO Optimization** | Meta descriptions, Open Graph, Twitter Cards, JSON-LD, robots.txt, sitemap.xml |

## Backend Skills
| Skill | Usage |
|-------|-------|
| **Node.js** | HTTP server, HTTPS requests, file system operations, crypto |
| **Native HTTP Server** | No Express — built from scratch with `http.createServer()` |
| **REST API Design** | 14+ endpoints with proper HTTP methods, status codes, JSON responses |
| **Authentication** | Token-based auth, PBKDF2 password hashing (SHA-512, 10K iterations), session management |
| **OAuth 2.0** | Google OAuth flow with authorization code exchange |
| **Email Verification** | 6-digit OTP system with 10-minute expiry, HTML email templates |
| **SMTP Integration** | Nodemailer with Gmail App Password for sending verification emails |
| **Server-Sent Events (SSE)** | Real-time streaming for AI agent task execution |
| **Static File Serving** | MIME type handling, SPA fallback routing |
| **CORS** | Cross-origin resource sharing headers for API routes |

## AI & Machine Learning Skills
| Skill | Usage |
|-------|-------|
| **LLM Integration** | Multi-model routing (Claude, Gemini, Grok) via InsForge API |
| **Prompt Engineering** | System prompts, auto-routing with regex patterns, prompt upgrade engine |
| **AI Image Generation** | InsForge Gemini API + Stable Horde API for text-to-image |
| **Web Search + RAG** | Grok model with real-time web access for search queries |
| **AI Agent Planning** | Task decomposition, step-by-step browser automation plans |
| **Auto-Intent Detection** | Regex-based classification for image/code/search requests |
| **Streaming Responses** | Chunked AI response rendering with typing animation |

## Browser Automation Skills
| Skill | Usage |
|-------|-------|
| **Playwright** | Browser automation framework (installed, used for planning) |
| **AppleScript** | macOS native scripting for controlling user's browser |
| **Cross-Browser Support** | Detection and control of Chrome, Safari, Brave, Edge, Firefox, Arc |
| **Safe Site Allowlist** | Security filtering with 27+ whitelisted domains |

## Security Skills
| Skill | Usage |
|-------|-------|
| **Password Hashing** | PBKDF2 with random salt (crypto module) |
| **Token Authentication** | 48-byte hex tokens for session management |
| **Input Validation** | Email/password validation, OTP expiry checks |
| **Action Filtering** | Blocked dangerous commands (rm, sudo, format, payment) |
| **CORS Configuration** | Proper cross-origin headers |
| **Guest Restrictions** | Tools and file upload blocked for unauthenticated users |

## DevOps & Deployment Skills
| Skill | Usage |
|-------|-------|
| **Environment Variables** | `.env` file for API keys and credentials |
| **Google Cloud Console** | OAuth 2.0 client setup, redirect URIs |
| **InsForge Platform** | AI Gateway, Auth, Database, Storage configuration |
| **PWA Deployment** | Manifest, service worker readiness, mobile install |

## Design Skills
| Skill | Usage |
|-------|-------|
| **Apple-Style UI** | Clean, professional design inspired by Apple/Notion |
| **Dark Theme** | Deep orange accent (#e8550f) on dark background |
| **Material Design Icons** | Google Material Symbols throughout UI |
| **Inter Typography** | Modern, clean font family |
| **Micro-Interactions** | Hover effects, button lifts, smooth transitions |
| **Loading States** | Spinners, skeleton states, progress indicators |
| **3D Welcome Page** | Floating orb with particle effects (landing page) |

## APIs & Services Used
| Service | Purpose |
|---------|---------|
| **InsForge** | AI model gateway, auth, database, storage |
| **Google OAuth** | "Continue with Google" authentication |
| **Gmail SMTP** | Email verification delivery |
| **Stable Horde** | Free image generation (fallback) |
| **DuckDuckGo Lite** | Web search results (deprecated, now uses Grok) |
| **Google Fonts** | Inter font family, Material Symbols |
| **highlight.js CDN** | Code syntax highlighting |
| **marked.js CDN** | Markdown parsing |

## Languages Used
- **JavaScript** (Node.js + Browser)
- **HTML5**
- **CSS3**
- **SQL** (planned for InsForge PostgreSQL)

## Tools Used
- **Claude Code** — AI-assisted development
- **Claude in Chrome** — Browser testing and automation
- **Git** — Version control
- **npm** — Package management
- **InsForge Dashboard** — Backend service management
- **Google Cloud Console** — OAuth configuration
