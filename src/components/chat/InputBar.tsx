"use client";

import { useRef, useState } from "react";
import { ArrowUp, Square, Paperclip, Mic } from "lucide-react";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ThinkingToggle } from "@/components/chat/ThinkingToggle";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface InputBarProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function InputBar({ onSend, onStop, isStreaming, disabled }: InputBarProps) {
  const [value, setValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setVoiceModalOpen = useUIStore((s) => s.setVoiceModalOpen);

  const charCount = value.length;

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div
      className={cn(
        "bg-surface-1 border border-white/10 rounded-2xl transition-all duration-150",
        "focus-within:border-surya-500/40 focus-within:ring-2 focus-within:ring-surya-500/20"
      )}
    >
      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Message Surya AI…"
        rows={1}
        style={{ minHeight: "44px", maxHeight: "200px", resize: "none" }}
        className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-white placeholder:text-gray-600 outline-none overflow-y-auto"
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 pb-2 pt-1">
        {/* Left: model, thinking, file, voice */}
        <div className="flex items-center gap-1">
          <ModelSelector />
          <ThinkingToggle />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-300 hover:bg-surface-2 transition-colors"
            title="Attach file"
          >
            <Paperclip size={14} />
          </button>
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-300 hover:bg-surface-2 transition-colors"
            title="Voice input"
          >
            <Mic size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.csv,.txt,.ts,.tsx,.js,.jsx,.py,.md"
            onChange={() => {
              // File upload handled in Phase 5
            }}
          />
        </div>

        {/* Right: char count + send/stop */}
        <div className="flex items-center gap-2">
          {charCount > 0 && (
            <span
              className={cn(
                "text-[10px]",
                charCount > 8000
                  ? "text-red-400"
                  : charCount > 4000
                    ? "text-amber-400"
                    : "text-gray-600"
              )}
            >
              {charCount}
            </span>
          )}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="h-8 w-8 flex items-center justify-center rounded-xl bg-surface-2 hover:bg-surface-2/80 text-white transition-colors"
              title="Stop"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-xl transition-colors",
                value.trim() && !disabled
                  ? "bg-surya-500 hover:bg-surya-700 text-white"
                  : "bg-surface-2 text-gray-600 cursor-not-allowed"
              )}
              title="Send"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
