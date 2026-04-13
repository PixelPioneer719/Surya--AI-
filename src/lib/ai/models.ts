/**
 * AI model constants — safe to import in client-side code.
 * Does NOT instantiate the AI client.
 */

export const MODEL_MAP = {
  sonnet: "anthropic/claude-sonnet-4.6", // default — fast, everyday tasks
  opus:   "anthropic/claude-opus-4.6",   // heavy tasks + Extended Thinking
} as const;

export type ModelKey = keyof typeof MODEL_MAP;

export const DEFAULT_MODEL: ModelKey = "sonnet";

export const MAX_TOKENS: Record<ModelKey, number> = {
  sonnet: 8192,
  opus:   16000,
} as const;

export const THINKING_BUDGET = 10000;

/**
 * Auto-select the best model based on message content and thinking toggle.
 * Users never choose the model — Surya AI picks for them.
 */
export function selectModel(message: string, thinkingEnabled: boolean): ModelKey {
  if (thinkingEnabled) return "opus";

  const len = message.length;
  const complexPattern =
    /analyz|research|explain in detail|write a (full|complete|detailed)|debug|refactor|architect|compare|summarize|review my|create a plan|strategy|step[- ]by[- ]step|in depth|comprehensive/i;

  if (len > 1500 || complexPattern.test(message)) return "opus";
  return "sonnet";
}
