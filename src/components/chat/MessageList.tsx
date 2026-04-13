"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "@/types/chat";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export function MessageList({ messages, isStreaming, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const wasStreamingRef = useRef(false);

  // Scroll when a new user/assistant message is added (not on every streaming token)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Scroll once when streaming finishes (the final complete message)
  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
    } else if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isStreaming]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
        <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
          <Image src="/logo.png" alt="Surya AI" width={40} height={40} className="rounded-sm" />
        </div>
        <h2 className="text-xl font-semibold text-white">How can I help you?</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Ask me anything — I can write code, answer questions, analyze data, and more.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming assistant message */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: "streaming",
              conversationId: "",
              role: "assistant",
              content: streamingContent,
              artifacts: [],
              createdAt: new Date().toISOString(),
            }}
            isStreaming={true}
            streamingContent={streamingContent}
          />
        )}

        {/* Thinking animation before first token */}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center bg-white/5 shrink-0">
              <Image src="/logo.png" alt="Surya AI" width={16} height={16} className="rounded-sm" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm bg-white/5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-2 h-2 rounded-full animate-bounce"
                  style={{
                    backgroundColor: "#1A73E8",
                    animationDelay: `${i * 0.18}s`,
                    animationDuration: "0.9s",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
