export type UserPlan = "free" | "pro" | "enterprise";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: UserPlan;
  credits: number;
  googleId?: string;
  githubId?: string;
  globalMemory?: string;
  createdAt: string;
}

export interface ConnectorToken {
  id: string;
  userId: string;
  provider: "google" | "github";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface MemoryEntry {
  id: string;
  userId: string;
  content: string;
  category: string;
  priority: number;
  createdAt: string;
}
