import { create } from "zustand";
import type { Conversation, Message } from "@/types/chat";

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  /** Deep thinking — when true, server routes to Opus automatically */
  thinkingEnabled: boolean;
  /** When true, Claude is given tool definitions to call Google/GitHub connectors */
  enableConnectors: boolean;
  /** When true, the chat API will perform web search before responding */
  enableWebSearch: boolean;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateStreamingContent: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  setEnableConnectors: (enabled: boolean) => void;
  setEnableWebSearch: (enabled: boolean) => void;
  resetStream: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  thinkingEnabled: false,
  enableConnectors: false,
  enableWebSearch: false,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateStreamingContent: (content) => set({ streamingContent: content }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setThinkingEnabled: (thinkingEnabled) => set({ thinkingEnabled }),
  setEnableConnectors: (enableConnectors) => set({ enableConnectors }),
  setEnableWebSearch: (enableWebSearch) => set({ enableWebSearch }),
  resetStream: () => set({ streamingContent: "", isStreaming: false }),
}));
