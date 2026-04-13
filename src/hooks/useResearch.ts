"use client";

import { useState, useCallback } from "react";
import type { ResearchStage, ArtifactType } from "@/types/chat";

export function useResearch() {
  const [isRunning, setIsRunning] = useState(false);
  const [stage, setStage] = useState<ResearchStage | null>(null);
  const [detail, setDetail] = useState<string>("");
  const [completedArtifact, setCompletedArtifact] = useState<ArtifactType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultConversationId, setResultConversationId] = useState<string | null>(null);

  const startResearch = useCallback(async (
    question: string,
    conversationId?: string,
    projectId?: string,
  ) => {
    setIsRunning(true);
    setStage("generating_queries");
    setDetail("Analyzing your question...");
    setCompletedArtifact(null);
    setError(null);

    let artifactId = "";
    let artifactTitle = "";
    let artifactContent = "";

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversationId, projectId }),
      });

      if (!res.ok) throw new Error(`Research failed: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case "research_progress":
                setStage(event.researchProgress?.stage ?? null);
                setDetail(event.researchProgress?.detail ?? "");
                break;
              case "artifact_start":
                artifactId = event.artifact?.id ?? crypto.randomUUID();
                artifactTitle = event.artifact?.title ?? "";
                artifactContent = "";
                break;
              case "text":
                artifactContent += event.content ?? "";
                break;
              case "artifact_end":
                setCompletedArtifact({
                  id: artifactId,
                  type: "document",
                  title: artifactTitle,
                  content: artifactContent,
                });
                break;
              case "done":
                setResultConversationId(event.content ?? null);
                break;
              case "error":
                throw new Error(event.error ?? "Research error");
            }
          } catch (parseErr) {
            if (
              parseErr instanceof Error &&
              !parseErr.message.startsWith("Research")
            ) {
              // JSON parse error — skip this line
            } else {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setIsRunning(false);
      setStage("done");
    }
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setStage(null);
    setDetail("");
    setCompletedArtifact(null);
    setError(null);
    setResultConversationId(null);
  }, []);

  return {
    isRunning,
    stage,
    detail,
    completedArtifact,
    error,
    resultConversationId,
    startResearch,
    reset,
  };
}
