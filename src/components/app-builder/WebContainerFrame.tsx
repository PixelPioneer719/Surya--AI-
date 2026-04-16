"use client";

import dynamic from "next/dynamic";
import { FileTreeComponent } from "./FileTree";
import { PreviewPane } from "./PreviewPane";
import type { FileTree } from "@/lib/webcontainer";
import type { WCStatus } from "@/hooks/useWebContainer";

// Monaco editor is client-only — dynamic import prevents SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <div className="flex-1 bg-[#1e1e1e]" /> }
);

function getLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    py: "python",
    sh: "shell",
    yml: "yaml",
    yaml: "yaml",
  };
  return map[ext] ?? "plaintext";
}

interface WebContainerFrameProps {
  status: WCStatus;
  previewUrl: string | null;
  terminalOutput: string;
  fileTree: FileTree;
  selectedFile: string | null;
  selectedFileContent: string;
  onSelectFile: (path: string) => void;
  onEditFile: (path: string, content: string) => Promise<void>;
  className?: string;
}

export function WebContainerFrame({
  status,
  previewUrl,
  terminalOutput,
  fileTree,
  selectedFile,
  selectedFileContent,
  onSelectFile,
  onEditFile,
  className = "",
}: WebContainerFrameProps) {
  const hasFiles = Object.keys(fileTree).length > 0;

  if (!hasFiles && status === "idle") {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full text-gray-500 gap-3 ${className}`}
      >
        <div className="text-5xl">⚡</div>
        <p className="text-sm">Generate an app above to see it here</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full overflow-hidden ${className}`}>
      {/* Left: File Tree */}
      <div className="w-[200px] flex-shrink-0 border-r border-white/5 bg-surface-1 overflow-y-auto">
        <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Explorer
          </span>
        </div>
        <FileTreeComponent
          files={fileTree}
          selectedFile={selectedFile}
          onSelect={onSelectFile}
        />
      </div>

      {/* Center: Monaco Editor */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-white/5">
        <div className="flex items-center px-3 py-1.5 border-b border-white/5 bg-surface-1 flex-shrink-0">
          <span className="text-xs text-gray-400 truncate">
            {selectedFile ?? "No file selected"}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedFile ? (
            <MonacoEditor
              height="100%"
              language={getLanguage(selectedFile)}
              value={selectedFileContent}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 20,
                padding: { top: 8 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
              }}
              onChange={(value) => {
                if (selectedFile && value !== undefined) {
                  onEditFile(selectedFile, value);
                }
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Select a file to edit
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div className="flex flex-col w-[45%] flex-shrink-0">
        <PreviewPane
          url={previewUrl}
          status={status}
          terminalOutput={terminalOutput}
        />
      </div>
    </div>
  );
}
