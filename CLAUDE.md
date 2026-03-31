# 🚀 Surya AI — Free AI Chatbot for Coding, Research & Image Generation

> **Built by PVS Hariharan**

---

## 👋 Welcome!

Hello! Welcome to the **Surya AI** project. This is an autonomous AI-powered chatbot that helps with:

- 💻 **Coding** — Write, debug, and explain code in any language
- 🔬 **Research** — Answer questions, summarize topics, and explore ideas
- 🎨 **Image Generation** — Create images from text prompts
- 💬 **General Chat** — Friendly, helpful conversations

---

## 📁 Project Structure

```
Surya--AI-/
├── .claude/              # Agent configuration & system prompts
│   ├── Frontend.md       # Frontend guidelines
│   ├── SuryaAI_AGENT.md  # Agent behavior specs
│   ├── SuryaAI_System.md # System prompt definitions
│   ├── Surya_Backend.md  # Backend architecture docs
│   └── launch.json       # Launch configuration
├── frontend/
│   ├── index.html        # Main web UI
│   ├── manifest.json     # PWA manifest
│   ├── robots.txt        # SEO robots file
│   └── sitemap.xml       # SEO sitemap
├── agent.js              # AI agent logic
├── server.js             # Express/Node.js backend server
├── package.json          # Node.js dependencies & scripts
├── render.yaml           # Render deployment config
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── CLAUDE.md             # This file — project overview
└── Skills.md             # AI skills & capabilities list
```

---

## 🛠️ Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/PixelPioneer719/Surya--AI-.git
cd Surya--AI-

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# 4. Start the server
npm start
```

### Open in Browser
Once the server is running, open your browser and navigate to:
```
http://localhost:3000
```

---

## 🌐 Deployment

This project is configured for **Render** deployment via `render.yaml`. Simply connect your GitHub repo to Render and it will auto-deploy.

---

## 📦 Dependencies

| Package | Purpose |
|---------|--------|
| `@insforge/sdk` | AI model SDK for chat & image generation |
| `nodemailer` | Email functionality |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

ISC License — see `package.json` for details.

---

**Made with ❤️ by PVS Hariharan | Surya AI**
