import { auth } from "@/auth";
import * as cheerio from "cheerio";
import { isSafeUrl, normalizeSearchResults } from "@/lib/web-utils";
import type { SearchResult } from "@/types/chat";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { action, query, url, limit } = body as {
    action: "search" | "scrape";
    query?: string;
    url?: string;
    limit?: number;
  };

  try {
    if (action === "search") {
      if (!query) {
        return Response.json({ error: "query is required" }, { status: 400 });
      }

      const res = await fetch(
        `${process.env.WEB_SEARCH_API_URL}/functions/v1/web-search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WEB_SEARCH_API_KEY}`,
            apikey: process.env.WEB_SEARCH_ANON_KEY ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, limit: limit ?? 5 }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        return Response.json(
          { error: `Search API error ${res.status}: ${text}` },
          { status: 502 }
        );
      }

      const data = await res.json();
      const raw: unknown[] = data.results ?? data.data ?? (Array.isArray(data) ? data : []);
      const results: SearchResult[] = normalizeSearchResults(raw, limit ?? 5);

      return Response.json({ results });
    }

    if (action === "scrape") {
      if (!url) {
        return Response.json({ error: "url is required" }, { status: 400 });
      }

      if (!isSafeUrl(url)) {
        return Response.json({ error: "Unsafe or invalid URL" }, { status: 400 });
      }

      const res = await fetch(url, {
        headers: { "User-Agent": "SuryaAI-Research/1.0" },
        signal: AbortSignal.timeout(8000),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text")) {
        return Response.json({ url, text: "" });
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      $("script, style, nav, footer, header, aside").remove();
      const text = ($("body").text() ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6000);

      return Response.json({ url, text });
    }

    return new Response(`Unknown action: ${action}`, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
