"use client";

import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ChevronDown, ChevronRight, Brain, Code2, FileText, Play, Sparkles } from "lucide-react";
import { CitationCard } from "./CitationCard";
import { StreamingText } from "./StreamingText";
import type { Message, ArtifactType } from "@/types/chat";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

const ARTIFACT_ICONS = {
  code: Code2,
  document: FileText,
  interactive: Play,
} as const;

const ArtifactChip = memo(function ArtifactChip({ artifact }: { artifact: ArtifactType }) {
  const { setArtifactPanel } = useUIStore();
  const Icon = ARTIFACT_ICONS[artifact.type];
  return (
    <button
      onClick={() => setArtifactPanel(true, artifact)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surya-500/40 bg-surya-500/10 hover:bg-surya-500/20 hover:border-surya-500/70 text-surya-500 text-xs font-medium transition-colors"
    >
      <Icon size={12} />
      <span className="truncate max-w-[180px]">{artifact.title}</span>
      {artifact.language && (
        <span className="text-gray-500 font-mono">{artifact.language}</span>
      )}
    </button>
  );
});

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
}

/**
 * Memoized — only re-renders when its own message prop or streaming state changes.
 * Prevents re-render of ALL prior messages on every streaming token.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  streamingContent = "",
}: MessageBubbleProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const isUser = message.role === "user";
  const displayContent = isStreaming ? streamingContent : message.content;

  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-surface-2 text-white rounded-br-sm"
            : "text-gray-100 rounded-bl-sm"
        )}
      >
        {/* Thinking block */}
        {message.thinking && (
          <div className="mb-3 border border-purple-800/40 rounded-lg overflow-hidden">
            <button
              onClick={() => setThinkingOpen((o) => !o)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-purple-400 hover:bg-purple-900/20 transition-colors"
            >
              <Brain size={12} />
              <span>Extended thinking</span>
              {thinkingOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {thinkingOpen && (
              <div className="px-3 pb-3 text-xs text-purple-300/70 italic whitespace-pre-wrap font-mono leading-relaxed border-t border-purple-800/30 pt-2">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Main content */}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            {isStreaming ? (
              <StreamingText content={displayContent} isStreaming={isStreaming} />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <code
                        className={cn(
                          "block bg-surface-2 rounded-lg p-3 text-xs overflow-x-auto",
                          className
                        )}
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code
                        className="bg-surface-2 rounded px-1 py-0.5 text-xs text-surya-accent"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return <pre className="not-prose">{children}</pre>;
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Artifact chips */}
        {!isUser && message.artifacts && message.artifacts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.artifacts.map((artifact) => (
              <ArtifactChip key={artifact.id} artifact={artifact} />
            ))}
          </div>
        )}

        {/* Powered by Gemini badge — shown for research document artifacts */}
        {!isUser && message.artifacts?.some(a => a.type === "document" && a.title.startsWith("Research:")) && (
          <div className="flex items-center gap-1.5 mt-2">
            <Sparkles size={10} className="text-surya-accent" />
            <span className="text-[10px] text-surya-accent font-medium tracking-wide">Powered by Gemini</span>
          </div>
        )}

        {/* Citation cards strip — shown for web search results */}
        {!isUser && message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium">Sources</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {message.searchResults.map((result) => (
                <CitationCard key={result.index} result={result} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
