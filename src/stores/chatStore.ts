import { create } from "zustand";
import type { Conversation, Message } from "@/types/chat";
import type { ModelKey } from "@/lib/ai/models";
import { DEFAULT_MODEL } from "@/lib/ai/models";

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  selectedModel: ModelKey;
  thinkingEnabled: boolean;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateStreamingContent: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setSelectedModel: (model: ModelKey) => void;
  setThinkingEnabled: (enabled: boolean) => void;
  resetStream: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  streamingContent: "",
  selectedModel: DEFAULT_MODEL,
  thinkingEnabled: false,

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
  updateStreamingContent: (content) => set({ streamingContent: content }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setThinkingEnabled: (thinkingEnabled) => set({ thinkingEnabled }),
  resetStream: () => set({ streamingContent: "", isStreaming: false }),
}));
