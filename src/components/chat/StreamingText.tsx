"use client";

import { useEffect, useState } from "react";

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

export function StreamingText({ content, isStreaming }: StreamingTextProps) {
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <span>
      {content}
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-4 bg-surya-500 ml-0.5 align-middle"
          style={{ opacity: cursorVisible ? 1 : 0, transition: "opacity 0.1s" }}
        />
      )}
    </span>
  );
}
