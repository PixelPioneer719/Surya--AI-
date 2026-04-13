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
  artifacts?: ArtifactType[];
  thinking?: string;
  tokens?: number;
  /** DB stores this as `timestamp` — aliased here for compat */
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  /** Auto-selected model stored at conversation level for reference */
  model?: string;
  projectId?: string;
  messages?: Message[];
  updatedAt: string;
  createdAt: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  /** Model is now auto-selected server-side — this field is ignored */
  model?: string;
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
