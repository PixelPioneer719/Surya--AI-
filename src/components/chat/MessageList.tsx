"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
        <div className="w-14 h-14 rounded-full bg-surya-500/10 border border-surya-500/20 flex items-center justify-center">
          <span className="text-2xl">✦</span>
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

        {/* Typing indicator before first token */}
        {isStreaming && !streamingContent && (
          <div className="flex mb-4">
            <div className="flex gap-1 px-4 py-3 rounded-2xl rounded-bl-sm">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-surya-500/60 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
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
