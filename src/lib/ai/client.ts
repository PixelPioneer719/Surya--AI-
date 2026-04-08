/**
 * InsForge Model Gateway — uses InsForge SDK's native AI client.
 * Single client for ALL AI models. No separate Anthropic or Google keys needed.
 * SERVER ONLY — never import this in client components.
 */

// Prevent this module from being bundled on the client
if (typeof window !== "undefined") {
  throw new Error("@/lib/ai/client must only be used server-side");
}

export type { ModelKey } from "./models";
export { MODEL_MAP, DEFAULT_MODEL, MAX_TOKENS, THINKING_BUDGET } from "./models";

import { insforge } from "@/lib/insforge";

// Use InsForge SDK's native AI client — routes to /api/ai/chat/completion internally
export const aiClient = insforge.ai;
