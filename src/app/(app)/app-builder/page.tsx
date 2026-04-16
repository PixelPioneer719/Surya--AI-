"use client";

import { useState, useCallback } from "react";
import { Wand2, Loader2, Zap } from "lucide-react";
import { useWebContainer } from "@/hooks/useWebContainer";
import { WebContainerFrame } from "@/components/app-builder/WebContainerFrame";

const EXAMPLE_PROMPTS = [
  "Todo app with local storage",
  "Calculator with history",
  "Weather dashboard UI",
  "Pomodoro timer",
  "Markdown editor with live preview",
];

export default function AppBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const {
    status,
    previewUrl,
    terminalOutput,
    fileTree,
    selectedFile,
    selectedFileContent,
    error: wcError,
    mountApp,
    editFile,
    selectFile,
  } = useWebContainer();

  const handleBuild = useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch("/api/app-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      await mountApp(data.files as Record<string, string>);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating, mountApp]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBuild();
    }
  };

  const isBuilding =
    generating || ["booting", "installing", "starting"].includes(status);
  const displayError = genError ?? wcError;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Prompt Bar */}
      <div className="flex-shrink-0 border-b border-white/5 bg-surface-1 px-4 py-3">
        <div className="flex items-start gap-3 max-w-5xl">
          <div className="relative flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the app you want to build... (Enter to build)"
              rows={1}
              disabled={isBuilding}
              className="w-full resize-none bg-surface-2 text-white text-sm rounded-lg px-4 py-2.5 border border-white/10 focus:outline-none focus:border-surya-500 placeholder-gray-500 disabled:opacity-50 transition-colors"
              style={{ minHeight: "40px", maxHeight: "80px" }}
            />
          </div>
          <button
            onClick={handleBuild}
            disabled={!prompt.trim() || isBuilding}
            className="flex items-center gap-2 px-4 py-2.5 bg-surya-500 hover:bg-surya-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            {isBuilding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {generating ? "Generating..." : "Building..."}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Build App
              </>
            )}
          </button>
        </div>

        {/* Example prompts */}
        {Object.keys(fileTree).length === 0 && !isBuilding && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Zap className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            {EXAMPLE_PROMPTS.map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="text-xs text-gray-400 hover:text-surya-500 bg-white/5 hover:bg-surya-500/10 px-2 py-0.5 rounded-full transition-colors border border-white/5 hover:border-surya-500/30"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {displayError && (
          <p className="mt-2 text-xs text-red-400">⚠️ {displayError}</p>
        )}
      </div>

      {/* WebContainer Frame */}
      <div className="flex-1 overflow-hidden">
        <WebContainerFrame
          status={status}
          previewUrl={previewUrl}
          terminalOutput={terminalOutput}
          fileTree={fileTree}
          selectedFile={selectedFile}
          selectedFileContent={selectedFileContent}
          onSelectFile={selectFile}
          onEditFile={editFile}
          className="h-full"
        />
      </div>
    </div>
  );
}
