"use client";

import { Brain } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThinkingToggle() {
  const { selectedModel, thinkingEnabled, setThinkingEnabled } = useChatStore();

  if (selectedModel !== "opus") return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={() => setThinkingEnabled(!thinkingEnabled)}
          className={cn(
            "flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors",
            thinkingEnabled
              ? "border border-purple-500/40 bg-purple-900/20 text-purple-300"
              : "text-gray-500 hover:text-gray-300 hover:bg-surface-2"
          )}
        >
          <Brain size={13} />
          <span>Extended Thinking</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Enables Claude&apos;s extended thinking — slower but more thorough
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
