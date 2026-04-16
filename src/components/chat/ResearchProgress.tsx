"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ResearchStage } from "@/types/chat";
import { cn } from "@/lib/utils";

const STAGES: { key: ResearchStage; label: string }[] = [
  { key: "generating_queries", label: "Planning queries" },
  { key: "searching",          label: "Searching web" },
  { key: "scraping",           label: "Reading sources" },
  { key: "synthesizing",       label: "Writing report" },
];

const STAGE_ORDER: ResearchStage[] = [
  "generating_queries",
  "searching",
  "scraping",
  "synthesizing",
  "done",
];

interface ResearchProgressProps {
  stage: ResearchStage | null;
  detail?: string;
  isRunning: boolean;
}

export function ResearchProgress({ stage, detail, isRunning }: ResearchProgressProps) {
  const currentIndex = stage ? STAGE_ORDER.indexOf(stage) : -1;

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          key="research-progress"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-3xl px-4 mb-4"
        >
          <div className="rounded-xl border border-surya-500/20 bg-surya-500/5 px-4 py-3">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Loader2 size={14} className="text-surya-accent animate-spin" />
              <span className="text-xs font-medium text-surya-accent">Deep Research in Progress</span>
            </div>

            {/* Stage steps */}
            <div className="flex items-center mb-3">
              {STAGES.map((s, i) => {
                const stageIdx = STAGE_ORDER.indexOf(s.key);
                const isComplete = currentIndex > stageIdx;
                const isActive = currentIndex === stageIdx;

                return (
                  <div key={s.key} className="flex items-center flex-1 min-w-0">
                    {/* Step */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <motion.div
                        animate={{
                          backgroundColor: isComplete
                            ? "#1A73E8"
                            : isActive
                            ? "rgba(26,115,232,0.3)"
                            : "rgba(255,255,255,0.05)",
                          borderColor: isComplete || isActive
                            ? "#1A73E8"
                            : "rgba(255,255,255,0.1)",
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      >
                        {isComplete ? (
                          <CheckCircle2 size={12} className="text-white" />
                        ) : isActive ? (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                            className="w-2 h-2 rounded-full bg-surya-500"
                          />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-white/20 block" />
                        )}
                      </motion.div>
                      <span className={cn(
                        "text-[10px] text-center leading-tight w-16 truncate",
                        isComplete ? "text-surya-500" : isActive ? "text-white" : "text-gray-600"
                      )}>
                        {s.label}
                      </span>
                    </div>

                    {/* Connector line (not after last) */}
                    {i < STAGES.length - 1 && (
                      <motion.div
                        className="flex-1 h-px mx-1 mb-5"
                        animate={{
                          backgroundColor: isComplete ? "#1A73E8" : "rgba(255,255,255,0.08)",
                        }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detail string */}
            <AnimatePresence mode="wait">
              {detail && (
                <motion.p
                  key={detail}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] text-gray-400 font-mono"
                >
                  {detail}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
