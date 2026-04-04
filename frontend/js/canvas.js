// ═══════════════════════════════════════════════════
//  CANVAS.JS - Canvas Workspace & WebContainer Management
// ═══════════════════════════════════════════════════

// Canvas Engine
const CanvasEngine = {
  webcontainer: null,
  isBooted: false,
  currentBundle: null,
  terminal: null,
  previewUrl: null,

  async boot() {
    if (this.isBooted) return;
    try {
      this.webcontainer = await window.WebContainer.boot();
      this.isBooted = true;
      console.log('WebContainer booted successfully');
    } catch (e) {
      console.error('Failed to boot WebContainer:', e);
      throw e;
    }
  },

  async mountAndRun(bundle) {
    if (!this.isBooted) await this.boot();
    this.currentBundle = bundle;

    try {
      await this.webcontainer.mount(this.convertBundleToTree(bundle));
      console.log('Bundle mounted successfully');

      if (bundle.commands && bundle.commands.length > 0) {
        await this.runCommands(bundle.commands);
      }
    } catch (e) {
      console.error('Failed to mount and run bundle:', e);
      throw e;
    }
  },

  convertBundleToTree(bundle) {
    const tree = {};
    if (bundle.files) {
      for (const [path, fileData] of Object.entries(bundle.files)) {
        const parts = path.split('/');
        let current = tree;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) current[part] = { directory: {} };
          current = current[part].directory;
        }
        const fileName = parts[parts.length - 1];
        current[fileName] = { file: { contents: fileData.file.contents } };
      }
    }
    return tree;
  },

  async runCommands(commands) {
    for (const cmd of commands) {
      try {
        const process = await this.webcontainer.spawn(cmd, { cwd: '/' });
        const output = await new Promise((resolve, reject) => {
          let stdout = '';
          let stderr = '';
          process.output.pipeTo(new WritableStream({
            write(data) { stdout += data; }
          }));
          process.stderr.pipeTo(new WritableStream({
            write(data) { stderr += data; }
          }));
          process.exit.then(code => {
            if (code === 0) resolve(stdout);
            else reject(new Error(`Command failed: ${cmd}\n${stderr}`));
          });
        });
        console.log(`Command "${cmd}" output:`, output);
      } catch (e) {
        console.error(`Command "${cmd}" failed:`, e);
        throw e;
      }
    }
  },

  async teardown() {
    if (this.webcontainer) {
      try {
        await this.webcontainer.teardown();
      } catch (e) {
        console.error('Error tearing down WebContainer:', e);
      }
      this.webcontainer = null;
      this.isBooted = false;
      this.currentBundle = null;
      this.previewUrl = null;
    }
  }
};

// Canvas Functions
async function startCanvasProject() {
  const prompt = messageInput.value.trim();
  if (!prompt) {
    messageInput.placeholder = 'Describe your app idea...';
    messageInput.focus();
    return;
  }

  const thinkingMsg = appendUserMsg(prompt);
  appendAIBubble('Thinking...', true);

  try {
    const canvasPrompt = await fetchCanvasPrompt();
    const systemPrompt = canvasPrompt.prompt || canvasPrompt;

    const response = await fetch('/api/ai/chat/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        model: MODELS['surya-code'].id,
        maxTokens: 8000,
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error('Failed to get AI response');

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.content || data.response;

    thinkingMsg.remove();
    removeLastAIBubble();

    if (looksLikeCanvasJson(content)) {
      const bundle = JSON.parse(content);
      await renderCanvasResult(bundle);
    } else {
      appendAIBubble(content);
    }
  } catch (e) {
    thinkingMsg.remove();
    removeLastAIBubble();
    appendAIBubble('Sorry, I encountered an error while generating your app. Please try again.');
    console.error('Canvas error:', e);
  }
}

async function fetchCanvasPrompt() {
  try {
    const res = await fetch('/api/canvas/prompt');
    if (!res.ok) throw new Error('Failed to fetch canvas prompt');
    return await res.json();
  } catch (e) {
    console.error('Error fetching canvas prompt:', e);
    return { prompt: 'You are a helpful AI assistant that can create web applications.' };
  }
}

function looksLikeCanvasJson(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && (parsed.files || parsed.plan);
  } catch (e) {
    return false;
  }
}

async function renderCanvasResult(bundle) {
  if (!bundle || !bundle.files) {
    appendAIBubble('Sorry, I couldn\'t generate a valid app bundle. Please try rephrasing your request.');
    return;
  }

  const plan = bundle.plan || 'Your app is ready!';
  const files = Object.keys(bundle.files);

  let html = `<div class="canvas-result">
    <div class="canvas-header">
      <h3>🎨 Canvas App Generated</h3>
      <p>${plan}</p>
    </div>
    <div class="canvas-files">
      <strong>Files created:</strong> ${files.join(', ')}
    </div>
    <div class="canvas-actions">
      <button class="build-app-btn" onclick="openCanvasWorkspace('${encodeURIComponent(JSON.stringify(bundle))}')">
        <span class="material-symbols-outlined">play_arrow</span>
        Open Workspace
      </button>
      <button class="secondary-btn" onclick="downloadCanvasBundle('${encodeURIComponent(JSON.stringify(bundle))}')">
        <span class="material-symbols-outlined">download</span>
        Download
      </button>
    </div>
  </div>`;

  appendAIBubble(html);
  highlightAllCode(document.querySelector('.canvas-result'));
}

function openCanvasWorkspace(bundleStr) {
  const bundle = JSON.parse(decodeURIComponent(bundleStr));
  showCanvasWorkspace(bundle);
}

function downloadCanvasBundle(bundleStr) {
  const bundle = JSON.parse(decodeURIComponent(bundleStr));
  const zip = new JSZip();

  for (const [path, fileData] of Object.entries(bundle.files)) {
    zip.file(path, fileData.file.contents);
  }

  zip.generateAsync({ type: 'blob' }).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-app.zip';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function showCanvasWorkspace(bundle) {
  const workspace = document.getElementById('canvasWorkspace');
  const preview = document.getElementById('canvasPreview');
  const codeView = document.getElementById('canvasCodeView');
  const terminal = document.getElementById('canvasTerminal');

  workspace.classList.remove('hidden');
  preview.innerHTML = '<div class="loading">Loading preview...</div>';
  codeView.innerHTML = '';
  terminal.innerHTML = '';

  // Populate code view
  for (const [path, fileData] of Object.entries(bundle.files)) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'code-file';
    fileDiv.innerHTML = `
      <div class="file-header">
        <span class="file-name">${path}</span>
        <button class="copy-btn" onclick="copyToClipboard('${encodeURIComponent(fileData.file.contents)}')">
          <span class="material-symbols-outlined">content_copy</span>
        </button>
      </div>
      <pre><code class="language-${getLanguageFromPath(path)}">${esc(fileData.file.contents)}</code></pre>
    `;
    codeView.appendChild(fileDiv);
  }

  highlightAllCode(codeView);

  // Mount and run in WebContainer
  CanvasEngine.mountAndRun(bundle).then(() => {
    // Listen for server-ready event
    CanvasEngine.webcontainer.on('server-ready', (port, url) => {
      CanvasEngine.previewUrl = url;
      preview.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`;
    });

    // Show terminal output
    CanvasEngine.webcontainer.on('terminal', (data) => {
      terminal.textContent += data;
      terminal.scrollTop = terminal.scrollHeight;
    });
  }).catch(e => {
    preview.innerHTML = '<div class="error">Failed to load preview</div>';
    console.error('Canvas workspace error:', e);
  });
}

function getLanguageFromPath(path) {
  const ext = path.split('.').pop().toLowerCase();
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python'
  };
  return langMap[ext] || 'text';
}

function copyToClipboard(content) {
  navigator.clipboard.writeText(decodeURIComponent(content));
}

function closeCanvasWorkspace() {
  const workspace = document.getElementById('canvasWorkspace');
  workspace.classList.add('hidden');
  CanvasEngine.teardown();
}

// Apps Mode Functions
function showAppsMode() {
  const appsGallery = document.getElementById('appsGallery');
  appsGallery.classList.remove('hidden');
  renderAppsGallery();
}

function hideAppsMode() {
  const appsGallery = document.getElementById('appsGallery');
  appsGallery.classList.add('hidden');
}

function renderAppsGallery() {
  const grid = document.getElementById('appsGrid');
  const templates = [
    {
      id: 'todo-app',
      title: 'Todo App',
      desc: 'A simple task management app with local storage',
      icon: 'checklist',
      category: 'Productivity',
      complexity: 'Beginner'
    },
    {
      id: 'weather-app',
      title: 'Weather App',
      desc: 'Real-time weather information with location services',
      icon: 'cloud',
      category: 'Utility',
      complexity: 'Intermediate'
    },
    {
      id: 'chat-app',
      title: 'Chat App',
      desc: 'Real-time messaging with WebSocket connections',
      icon: 'chat',
      category: 'Social',
      complexity: 'Advanced'
    },
    {
      id: 'blog-platform',
      title: 'Blog Platform',
      desc: 'Full-featured blogging platform with CMS',
      icon: 'article',
      category: 'Content',
      complexity: 'Advanced'
    },
    {
      id: 'ecommerce-store',
      title: 'E-commerce Store',
      desc: 'Online shopping platform with payment integration',
      icon: 'shopping_cart',
      category: 'Business',
      complexity: 'Expert'
    },
    {
      id: 'portfolio-site',
      title: 'Portfolio Site',
      desc: 'Personal portfolio website with projects showcase',
      icon: 'web',
      category: 'Personal',
      complexity: 'Beginner'
    }
  ];

  grid.innerHTML = templates.map(template => `
    <div class="app-template" onclick="createAppFromTemplate('${template.id}')">
      <div class="template-icon">
        <span class="material-symbols-outlined">${template.icon}</span>
      </div>
      <div class="template-info">
        <h4>${template.title}</h4>
        <p>${template.desc}</p>
        <div class="template-meta">
          <span class="category">${template.category}</span>
          <span class="complexity ${template.complexity.toLowerCase()}">${template.complexity}</span>
        </div>
      </div>
      <div class="template-action">
        <span class="material-symbols-outlined">arrow_forward</span>
      </div>
    </div>
  `).join('');
}

async function createAppFromTemplate(templateId) {
  const templates = {
    'todo-app': {
      prompt: 'Create a modern todo app with React, TypeScript, and Tailwind CSS. Include features like adding tasks, marking as complete, filtering by status, and local storage persistence.'
    },
    'weather-app': {
      prompt: 'Build a weather dashboard app using Vue.js and OpenWeatherMap API. Show current weather, 5-day forecast, location search, and responsive design.'
    },
    'chat-app': {
      prompt: 'Develop a real-time chat application with Socket.io, Express backend, and React frontend. Include user authentication, room management, and message history.'
    },
    'blog-platform': {
      prompt: 'Create a full-stack blog platform with Next.js, MongoDB, and authentication. Include post creation, editing, commenting, and admin dashboard.'
    },
    'ecommerce-store': {
      prompt: 'Build an e-commerce store with React, Node.js, and Stripe payment integration. Include product catalog, shopping cart, checkout process, and order management.'
    },
    'portfolio-site': {
      prompt: 'Design a personal portfolio website with HTML, CSS, and JavaScript. Include sections for about, projects, skills, and contact form with modern animations.'
    }
  };

  const template = templates[templateId];
  if (!template) return;

  hideAppsMode();
  messageInput.value = template.prompt;
  await startCanvasProject();
}

// Utility Functions
function esc(str) {
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}</content>
<parameter name="filePath">/Volumes/Prabhas SSD/Devoloper/Surya AI/frontend/js/canvas.js