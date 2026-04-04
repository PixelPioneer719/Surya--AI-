# Architecture Deep-Dive: CanvasEngine & WebContainer Integration

## Overview
The Canvas IDE is powered by StackBlitz WebContainers, providing real Node.js execution in the browser. This document details the technical implementation and integration patterns.

## Core Architecture

### CanvasEngine Object
The main controller for Canvas operations:

```javascript
const CanvasEngine = {
  // Initialize WebContainer
  boot: async () => {
    try {
      this.webcontainer = await WebContainer.boot();
      this.webcontainer.on('server-ready', (port, url) => {
        this.devServerUrl = url;
        this.renderCanvasResult();
      });
      return true;
    } catch (error) {
      console.error('WebContainer boot failed:', error);
      return false;
    }
  },

  // Mount and run project bundle
  mountAndRun: async (bundle) => {
    const tree = this.convertBundleToTree(bundle);
    await this.webcontainer.mount(tree);

    // Execute commands
    for (const command of bundle.commands) {
      const [cmd, ...args] = command.split(' ');
      const process = await this.webcontainer.spawn(cmd, args);

      // Stream output to terminal
      process.output.pipeTo(new WritableStream({
        write: (chunk) => {
          this.appendToTerminal(chunk);
        }
      }));
    }
  },

  // Convert JSON bundle to file tree
  convertBundleToTree: (bundle) => {
    const tree = {};
    for (const [path, fileData] of Object.entries(bundle.files)) {
      const segments = path.split('/');
      let current = tree;

      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        current[segment] = current[segment] || {};
        current = current[segment];
      }

      const filename = segments[segments.length - 1];
      current[filename] = {
        file: {
          contents: fileData.file.contents
        }
      };
    }
    return tree;
  },

  // Clean up resources
  teardown: () => {
    if (this.webcontainer) {
      this.webcontainer.teardown();
      this.webcontainer = null;
      this.devServerUrl = null;
    }
  }
};
```

## WebContainer Integration Details

### API Loading
```html
<!-- Load WebContainer API from CDN -->
<script src="https://cdn.jsdelivr.net/npm/@webcontainer/api@1.1.9/dist/index.js"></script>
```

### Cross-Origin Isolation
Required for SharedArrayBuffer support:
```javascript
// Server headers for all routes
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
```

### Secure Context Requirements
- HTTPS in production
- localhost in development
- No HTTP plain text

## Canvas Bundle Processing

### Bundle Validation
```javascript
function validateBundle(bundle) {
  // Required fields
  if (!bundle.plan || !bundle.files || !bundle.commands) {
    throw new Error('Invalid bundle: missing required fields');
  }

  // Validate file structure
  for (const [path, fileData] of Object.entries(bundle.files)) {
    if (!fileData.file || !fileData.file.contents) {
      throw new Error(`Invalid file structure for ${path}`);
    }
  }

  // Validate commands
  if (!Array.isArray(bundle.commands)) {
    throw new Error('Commands must be an array');
  }

  return true;
}
```

### File Tree Conversion
The `convertBundleToTree` method transforms the JSON bundle into WebContainer's expected file tree format:

```javascript
// Input bundle format
{
  "files": {
    "package.json": {
      "file": {
        "contents": "{ \"name\": \"app\" }"
      }
    },
    "src/main.js": {
      "file": {
        "contents": "console.log('Hello');"
      }
    }
  }
}

// Output tree format
{
  "package.json": {
    "file": {
      "contents": "{ \"name\": \"app\" }"
    }
  },
  "src": {
    "main.js": {
      "file": {
        "contents": "console.log('Hello');"
      }
    }
  }
}
```

## UI Integration

### Split Panel Layout
```css
.canvas-workspace {
  position: fixed;
  inset: 0;
  display: grid;
  grid-template-columns: 35% 65%;
  gap: 0;
}

.canvas-chat-panel {
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.canvas-preview-panel {
  display: grid;
  grid-template-rows: 1fr auto;
}

.canvas-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.canvas-terminal {
  height: 200px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  overflow-y: auto;
}
```

### Live Preview Integration
```javascript
renderCanvasResult: () => {
  const iframe = document.getElementById('canvas-iframe');
  if (this.devServerUrl) {
    iframe.src = this.devServerUrl;
  }
}
```

### Terminal Output Streaming
```javascript
appendToTerminal: (chunk) => {
  const terminal = document.getElementById('canvas-terminal');
  const line = document.createElement('div');
  line.textContent = chunk;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}
```

## Project Isolation

### Container Management
Each Canvas project runs in its own WebContainer instance:
- **Isolation**: Complete separation between projects
- **Resource Limits**: Automatic cleanup on project changes
- **Security**: No cross-project data access

### Database Integration (Phase 1)
```javascript
// Supabase environment injection
injectEnvironment: (bundle, supabaseConfig) => {
  // Add .env file to bundle
  bundle.files['.env'] = {
    file: {
      contents: `VITE_SUPABASE_URL=${supabaseConfig.url}
VITE_SUPABASE_ANON_KEY=${supabaseConfig.anonKey}`
    }
  };

  // Add Supabase dependency
  const packageJson = JSON.parse(bundle.files['package.json'].file.contents);
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies['@supabase/supabase-js'] = '^2.39.0';
  bundle.files['package.json'].file.contents = JSON.stringify(packageJson, null, 2);

  return bundle;
}
```

## Error Handling

### Container Boot Failures
```javascript
async function handleBootFailure(error) {
  console.error('WebContainer boot failed:', error);

  // Show user-friendly error
  showCanvasError('Failed to initialize development environment. Please try again.');

  // Attempt retry with backoff
  if (this.retryCount < 3) {
    this.retryCount++;
    setTimeout(() => this.boot(), 1000 * this.retryCount);
  }
}
```

### Command Execution Errors
```javascript
process.output.pipeTo(new WritableStream({
  write: (chunk) => {
    this.appendToTerminal(chunk);
  }
}));

// Handle process exit
process.exit.then((exitCode) => {
  if (exitCode !== 0) {
    this.showCommandError(`Command failed with exit code ${exitCode}`);
  }
});
```

## Performance Optimization

### Lazy Loading
- WebContainer API loaded only when Canvas is opened
- Project files mounted incrementally
- Terminal output throttled to prevent UI blocking

### Memory Management
- Automatic container teardown on navigation
- File tree optimization for large projects
- Garbage collection hints for long-running sessions

### Caching Strategy
- Bundle validation results cached
- Frequently used templates pre-loaded
- Dev server URLs cached during session

## Security Considerations

### Content Security Policy
```javascript
// CSP headers for Canvas iframe
res.setHeader('Content-Security-Policy',
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
  "style-src 'self' 'unsafe-inline'; " +
  "frame-src 'self' data: blob:;"
);
```

### Input Sanitization
- Bundle contents validated before mounting
- File paths sanitized to prevent directory traversal
- Command arguments validated against allowlist

### Resource Limits
- Container memory limits enforced
- File size limits for uploaded content
- Execution timeouts for long-running commands

## Future Enhancements

### Phase 2: Iterative Editing
- Modify running applications via follow-up prompts
- Hot-reload integration for code changes
- File explorer with syntax-highlighted editing

### Phase 3: Advanced Features
- Collaborative editing with real-time sync
- Template marketplace for pre-built apps
- Advanced debugging tools and breakpoints
- Performance profiling and optimization tools