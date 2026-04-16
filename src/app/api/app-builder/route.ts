import { auth } from "@/auth";
import { aiClient, MODEL_MAP } from "@/lib/ai/client";

const SYSTEM_PROMPT = `You are an expert app builder AI. The user will describe a web app they want.

Output ONLY valid JSON — no markdown fences, no explanation, just raw JSON:

{
  "files": {
    "package.json": "...",
    "vite.config.js": "...",
    "index.html": "...",
    "src/main.jsx": "...",
    "src/App.jsx": "...",
    "src/index.css": "..."
  },
  "startCommand": "npm run dev"
}

Requirements:
- Use React 18 (no TypeScript) with Vite for fastest boot
- package.json must include "dev": "vite" in scripts and "build": "vite build"
- Make ALL buttons and features fully working — no placeholders
- Use inline styles or Tailwind CDN via a <script> tag in index.html if needed
- Code must run without errors on first boot
- Do not use packages that require native bindings or Node.js APIs`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (aiClient.chat.completions.create as any)({
      model: MODEL_MAP.sonnet,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Build this app: ${prompt}` },
      ],
      stream: false,
      maxTokens: 8192,
    });

    const raw: string = response.choices[0]?.message?.content ?? "";

    // Strip markdown fences if the model adds them despite instructions
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: { files?: Record<string, string>; startCommand?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[app-builder] Failed to parse JSON:", cleaned.slice(0, 500));
      return Response.json(
        { error: "AI returned invalid JSON. Please try a more specific prompt." },
        { status: 400 }
      );
    }

    if (!parsed.files || typeof parsed.files !== "object") {
      return Response.json(
        { error: "AI response missing files object." },
        { status: 400 }
      );
    }

    return Response.json({
      files: parsed.files,
      startCommand: parsed.startCommand ?? "npm run dev",
    });
  } catch (err) {
    console.error("[app-builder] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
