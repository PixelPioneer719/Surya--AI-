"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, Download, Code2 } from "lucide-react";
import type { ArtifactType } from "@/types/chat";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface CodeArtifactProps {
  artifact: ArtifactType;
}

export function CodeArtifact({ artifact }: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const ext = artifact.language ?? "txt";
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-mono">
            {artifact.language ?? "text"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={artifact.language ?? "plaintext"}
          value={artifact.content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            padding: { top: 12, bottom: 12 },
            folding: true,
            contextmenu: false,
          }}
        />
      </div>
    </div>
  );
}
