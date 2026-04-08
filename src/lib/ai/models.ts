/**
 * AI model constants — safe to import in client-side code.
 * Does NOT instantiate the OpenAI client.
 */

export const MODEL_MAP = {
  sonnet: "anthropic/claude-sonnet-4.6",             // default — fast, everyday tasks
  opus:   "anthropic/claude-opus-4.6",               // heavy tasks + Extended Thinking
  gemini: "google/gemini-2.5-pro-preview-03-25",     // image generation / vision
} as const;

export type ModelKey = keyof typeof MODEL_MAP;

export const DEFAULT_MODEL: ModelKey = "sonnet";

export const MAX_TOKENS = {
  sonnet: 8192,
  opus:   16000,
  gemini: 8192,
} as const;

export const THINKING_BUDGET = 10000;
