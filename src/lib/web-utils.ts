import type { SearchResult } from "@/types/chat";

/**
 * SSRF protection — returns false for any URL that resolves to a private/loopback address.
 * Applied before every user-supplied URL fetch (scraping, n8n base URL, etc.).
 */
export function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const h = parsed.hostname;
  // Block loopback, link-local, RFC-1918, and AWS metadata endpoint
  const blocked =
    /^(localhost|127\.|0\.0\.0\.0|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/;
  return !blocked.test(h);
}

/**
 * Normalize raw search API results to the SearchResult schema.
 * Handles varying field names from different search providers.
 */
export function normalizeSearchResults(
  raw: unknown[],
  limit: number
): SearchResult[] {
  return (raw as Record<string, unknown>[])
    .slice(0, limit)
    .map((r, i) => {
      const url = String(r.url ?? r.link ?? "");
      let domain = "";
      try {
        domain = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        domain = url;
      }
      return {
        index: i + 1,
        title: String(r.title ?? ""),
        url,
        domain,
        snippet: String(r.description ?? r.snippet ?? r.body ?? ""),
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      };
    })
    .filter((r) => r.url.startsWith("http"));
}
