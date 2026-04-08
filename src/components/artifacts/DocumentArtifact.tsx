"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, FileText } from "lucide-react";
import type { ArtifactType } from "@/types/chat";

interface DocumentArtifactProps {
  artifact: ArtifactType;
}

export function DocumentArtifact({ artifact }: DocumentArtifactProps) {
  function handleDownload() {
    const blob = new Blob([artifact.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">Markdown</span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
        >
          <Download size={12} />
          Export .md
        </button>
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="prose prose-sm prose-invert max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-li:text-gray-300
          prose-strong:text-white
          prose-code:bg-surface-2 prose-code:text-surya-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-surface-2 prose-pre:rounded-lg
          prose-blockquote:border-l-surya-500 prose-blockquote:text-gray-400
          prose-hr:border-white/10
          prose-a:text-surya-500 prose-a:no-underline hover:prose-a:underline
          prose-table:text-gray-300 prose-th:text-white prose-th:border-white/20 prose-td:border-white/10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {artifact.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
