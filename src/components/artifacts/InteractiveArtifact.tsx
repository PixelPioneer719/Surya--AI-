"use client";

import { useMemo } from "react";
import { Play, AlertTriangle } from "lucide-react";
import type { ArtifactType } from "@/types/chat";

interface InteractiveArtifactProps {
  artifact: ArtifactType;
}

export function InteractiveArtifact({ artifact }: InteractiveArtifactProps) {
  const srcdoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e5e7eb;
      padding: 16px;
      min-height: 100vh;
    }
    #root { width: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifact.content}

    const rootEl = document.getElementById('root');
    if (typeof App !== 'undefined') {
      ReactDOM.createRoot(rootEl).render(React.createElement(App));
    } else {
      rootEl.innerHTML = '<p style="color:#ef4444;font-size:14px">Error: No <code>App</code> component found. Make sure your code exports a component named <strong>App</strong>.</p>';
    }
  </script>
</body>
</html>`;
  }, [artifact.content]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-green-400" />
          <span className="text-xs text-gray-400">Live Preview</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-yellow-500/80">
          <AlertTriangle size={11} />
          <span>Sandboxed — no network access</span>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title={artifact.title}
        />
      </div>
    </div>
  );
}
