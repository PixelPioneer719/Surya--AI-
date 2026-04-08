export interface KnowledgeFile {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  rawContent: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  knowledgeFiles: KnowledgeFile[];
  createdAt: string;
  updatedAt: string;
}
