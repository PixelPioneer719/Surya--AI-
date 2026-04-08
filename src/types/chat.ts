import type { ModelKey } from "@/lib/ai/models";

export type MessageRole = "user" | "assistant" | "system";

export interface ArtifactType {
  id: string;
  type: "code" | "document" | "interactive";
  title: string;
  content: string;
  language?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  artifacts: ArtifactType[];
  thinking?: string;
  tokens?: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: ModelKey;
  projectId?: string;
  messages?: Message[];
  updatedAt: string;
  createdAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  model?: ModelKey;
  projectId?: string;
  thinking?: boolean;
  enableConnectors?: boolean;
  attachments?: { name: string; content: string; type: string }[];
}

export interface StreamEvent {
  type: "text" | "artifact_start" | "artifact_end" | "thinking" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  artifact?: Partial<ArtifactType>;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  error?: string;
}
