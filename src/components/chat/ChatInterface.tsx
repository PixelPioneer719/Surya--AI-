"use client";

import { useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useChatStore } from "@/stores/chatStore";
import { MessageList } from "@/components/chat/MessageList";
import { InputBar } from "@/components/chat/InputBar";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { useUIStore } from "@/stores/uiStore";

interface ChatInterfaceProps {
  conversationId?: string;
  projectId?: string;
}

export function ChatInterface({ conversationId, projectId }: ChatInterfaceProps) {
  const { messages, isStreaming, streamingContent, sendMessage, stopStreaming } = useChat(projectId);
  const { setMessages, setActiveConversation, activeConversationId } = useChatStore();
  const { artifactPanelOpen } = useUIStore();

  useEffect(() => {
    if (!conversationId) {
      // New chat — reset state
      setMessages([]);
      setActiveConversation(null);
      return;
    }

    if (conversationId === activeConversationId) return;

    setActiveConversation(conversationId);

    // Load messages from API
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data) => {
        setMessages(data.documents ?? []);
      })
      .catch(() => {
        // Conversation not found or unauthorized — messages stay empty
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Chat column */}
      <div className="relative z-10 flex flex-col flex-1 min-w-0 h-full">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />

        <div className={`px-4 pb-4 pt-2 w-full ${artifactPanelOpen ? "max-w-2xl" : "max-w-3xl"} mx-auto`}>
          <InputBar
            onSend={(content) => sendMessage(content, conversationId)}
            onStop={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Artifact panel */}
      <ArtifactPanel />
    </div>
  );
}
