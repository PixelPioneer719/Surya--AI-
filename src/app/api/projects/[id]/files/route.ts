import { auth } from "@/auth";
import { db } from "@/lib/insforge";
import { invalidateCache } from "@/lib/knowledge-cache";
import { randomUUID } from "crypto";
import type { Project } from "@/types/project";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PROJECT_BYTES = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "text/x-python",
  "text/x-typescript",
  "text/x-javascript",
  "application/javascript",
  "text/markdown",
]);

const ALLOWED_EXTS = new Set([".pdf", ".csv", ".txt", ".ts", ".tsx", ".js", ".jsx", ".py", ".md"]);

function csvToMarkdown(csv: string): string {
  const lines = csv.trim().split("\n");
  if (lines.length === 0) return csv;
  const rows = lines.map((l) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, "")));
  const header = `| ${rows[0].join(" | ")} |`;
  const sep = `| ${rows[0].map(() => "---").join(" | ")} |`;
  const body = rows.slice(1).map((r) => `| ${r.join(" | ")} |`).join("\n");
  return [header, sep, body].join("\n");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { id: projectId } = await params;

  // Verify project ownership
  const projResult = await db.projects("findOne", { filter: { id: projectId, userId } }) as { document: Project | null };
  if (!projResult.document) return new Response("Not found", { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return new Response("No file provided", { status: 400 });

  // Validate size
  if (file.size > MAX_FILE_BYTES) {
    return new Response("File exceeds 10MB limit", { status: 413 });
  }

  // Validate extension
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTS.has(ext)) {
    return new Response("File type not supported", { status: 415 });
  }

  // Validate MIME type (server-side)
  if (file.type && !ALLOWED_TYPES.has(file.type) && !file.type.startsWith("text/")) {
    return new Response("File type not supported", { status: 415 });
  }

  // Check total project size
  const existingFiles = await db.knowledgeFiles("find", { filter: { projectId, userId } }) as { documents: { size: number }[] };
  const totalSize = (existingFiles.documents ?? []).reduce((sum, f) => sum + (f.size ?? 0), 0);
  if (totalSize + file.size > MAX_PROJECT_BYTES) {
    return new Response("Project knowledge base exceeds 50MB limit", { status: 413 });
  }

  // Extract text content
  let rawContent = "";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (ext === ".pdf") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfModule = await import("pdf-parse") as any;
    const pdfParse = pdfModule.default ?? pdfModule;
    const parsed = await pdfParse(buffer);
    rawContent = parsed.text;
  } else if (ext === ".csv") {
    rawContent = csvToMarkdown(buffer.toString("utf-8"));
  } else {
    rawContent = buffer.toString("utf-8");
  }

  const now = new Date().toISOString();
  const knowledgeFile = {
    id: randomUUID(),
    projectId,
    userId,
    name: file.name,
    rawContent,
    size: file.size,
    mimeType: file.type || "text/plain",
    createdAt: now,
  };

  await db.knowledgeFiles("insertOne", { document: knowledgeFile });
  invalidateCache(`project:${projectId}`);

  return Response.json({ document: knowledgeFile }, { status: 201 });
}
