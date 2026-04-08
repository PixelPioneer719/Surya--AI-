"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Zap, Brain, Eye } from "lucide-react";
import { useChatStore } from "@/stores/chatStore";
import type { ModelKey } from "@/lib/ai/models";
import { cn } from "@/lib/utils";

const MODELS: { key: ModelKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "sonnet", label: "Sonnet 4.6", desc: "Fast · everyday tasks", icon: <Zap size={14} /> },
  { key: "opus",   label: "Opus 4.6",   desc: "Powerful · complex reasoning", icon: <Brain size={14} /> },
  { key: "gemini", label: "Gemini Pro", desc: "Vision · multimodal", icon: <Eye size={14} /> },
];

export function ModelSelector() {
  const { selectedModel, setSelectedModel, isStreaming } = useChatStore();
  const current = MODELS.find((m) => m.key === selectedModel) ?? MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isStreaming}
        className="h-7 gap-1.5 text-xs text-gray-400 hover:text-white hover:bg-surface-2 px-2 inline-flex items-center rounded-md transition-colors"
      >
        {current.icon}
        <span>{current.label}</span>
        <ChevronDown size={12} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52 bg-surface-1 border-white/10"
      >
        {MODELS.map((m) => (
          <DropdownMenuItem
            key={m.key}
            onClick={() => setSelectedModel(m.key)}
            className={cn(
              "flex items-start gap-2 py-2 cursor-pointer",
              selectedModel === m.key && "bg-surya-500/10 text-surya-500"
            )}
          >
            <span className="mt-0.5">{m.icon}</span>
            <div>
              <p className="text-xs font-medium">{m.label}</p>
              <p className="text-[10px] text-gray-500">{m.desc}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
