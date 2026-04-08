import { auth } from "@/auth";
import { aiClient, MODEL_MAP, MAX_TOKENS, THINKING_BUDGET } from "@/lib/ai/client";
import { db } from "@/lib/insforge";
import { getCached, setCache } from "@/lib/knowledge-cache";
import type { ChatRequest, Message, ArtifactType, StreamEvent } from "@/types/chat";
import type { Project, KnowledgeFile } from "@/types/project";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

function send(controller: ReadableStreamDefaultController, event: StreamEvent) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: ChatRequest = await req.json();
  const { message, model = "sonnet", thinking = false, conversationId, projectId } = body;

  if (!message?.trim()) {
    return new Response("Message required", { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const modelId = MODEL_MAP[model];
  const maxTokens = MAX_TOKENS[model];

  // Build or load conversation
  let convId = conversationId;
  if (!convId) {
    const newConv = await db.conversations("insertOne", {
      document: {
        id: randomUUID(),
        userId,
        title: message.slice(0, 60),
        model,
        projectId: projectId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }) as { document: { id: string } };
    convId = newConv.document.id;
  } else {
    await db.conversations("updateOne", {
      filter: { id: convId },
      update: { $set: { updatedAt: new Date().toISOString() } },
    });
  }

  // Load prior messages for context (messages table uses `timestamp` not `created_at`)
  const history = await db.messages("find", {
    filter: { conversationId: convId },
    sort: { timestamp: 1 },
    limit: 40,
  }) as { documents: Message[] };

  // Persist user message
  const userMsgId = randomUUID();
  await db.messages("insertOne", {
    document: {
      id: userMsgId,
      conversationId: convId,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    },
  });

  // Build OpenAI-style messages array
  const apiMessages = [
    ...(history.documents ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Build project context if projectId is provided
  let projectContext = "";
  if (projectId) {
    const cacheKey = `project:${projectId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      projectContext = cached;
    } else {
      const projResult = await db.projects("findOne", { filter: { id: projectId, userId } }) as { document: Project | null };
      if (projResult.document) {
        const filesResult = await db.knowledgeFiles("find", { filter: { projectId, userId } }) as { documents: KnowledgeFile[] };
        const proj = projResult.document;
        const files = filesResult.documents ?? [];
        const knowledgeBlock = files.length > 0
          ? "\n\n## Knowledge Base\n" + files.map((f) => `### ${f.name}\n${f.rawContent}`).join("\n\n")
          : "";
        projectContext = `You are working inside the "${proj.name}" project.\n\n## Project Instructions\n${proj.systemPrompt || "No specific instructions."}${knowledgeBlock}`;
        setCache(cacheKey, projectContext);
      }
    }
  }

  // System prompt
  const basePrompt = `You are Surya AI — the AI that thinks with you.
You are helpful, clear, and direct. For code, documents, or interactive content, wrap output in XML:
<artifact type="code" language="tsx" title="Component Name">
// code here
</artifact>
<artifact type="document" title="Report Title">
## Content here
</artifact>
<artifact type="interactive" title="Demo Title">
// self-contained React component
</artifact>`;
  const systemPrompt = projectContext ? `${projectContext}\n\n---\n\n${basePrompt}` : basePrompt;

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let thinkingContent = "";
      const artifacts: ArtifactType[] = [];

      // Artifact state machine
      let artifactBuffer = "";
      let inArtifact = false;
      let currentArtifactMeta: Partial<ArtifactType> = {};

      try {
        const completion = await aiClient.chat.completions.create({
          model: modelId,
          messages: [
            { role: "system", content: systemPrompt },
            ...apiMessages,
          ],
          stream: true,
          maxTokens: thinking && model === "opus" ? 16000 : maxTokens,
          ...(thinking && model === "opus" ? { thinking: true } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as AsyncIterable<{ choices: Array<{ delta: { content?: string; thinking?: string } }> }>;

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Handle thinking blocks (Opus extended thinking)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const anyDelta = delta as any;
          if (anyDelta.thinking) {
            thinkingContent += anyDelta.thinking;
            send(controller, { type: "thinking", content: anyDelta.thinking });
            continue;
          }

          const text = delta.content ?? "";
          if (!text) continue;

          fullContent += text;
          artifactBuffer += text;

          // State machine: detect artifact tags
          if (!inArtifact) {
            const openMatch = artifactBuffer.match(
              /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?>/
            );
            if (openMatch) {
              inArtifact = true;
              currentArtifactMeta = {
                id: randomUUID(),
                type: openMatch[1] as ArtifactType["type"],
                language: openMatch[2],
                title: openMatch[3] ?? "Untitled",
                content: "",
              };
              const beforeTag = artifactBuffer.slice(
                0,
                artifactBuffer.lastIndexOf(openMatch[0])
              );
              if (beforeTag.trim()) {
                send(controller, { type: "text", content: beforeTag });
              }
              send(controller, {
                type: "artifact_start",
                artifact: currentArtifactMeta,
              });
              artifactBuffer = artifactBuffer.slice(
                artifactBuffer.lastIndexOf(openMatch[0]) + openMatch[0].length
              );
            } else {
              // Emit safe portion (keep last 200 chars in buffer for partial tag detection)
              if (artifactBuffer.length > 200) {
                const safe = artifactBuffer.slice(0, -200);
                send(controller, { type: "text", content: safe });
                artifactBuffer = artifactBuffer.slice(-200);
              }
            }
          } else {
            // Inside artifact — look for closing tag
            const closeIdx = artifactBuffer.indexOf("</artifact>");
            if (closeIdx !== -1) {
              const artifactContent = artifactBuffer.slice(0, closeIdx);
              currentArtifactMeta.content =
                (currentArtifactMeta.content ?? "") + artifactContent;
              artifacts.push(currentArtifactMeta as ArtifactType);
              send(controller, {
                type: "artifact_end",
                artifact: currentArtifactMeta,
              });
              inArtifact = false;
              artifactBuffer = artifactBuffer.slice(
                closeIdx + "</artifact>".length
              );
              currentArtifactMeta = {};
            } else {
              // Keep last 20 chars to handle split </artifact> tag
              if (artifactBuffer.length > 20) {
                currentArtifactMeta.content =
                  (currentArtifactMeta.content ?? "") +
                  artifactBuffer.slice(0, -20);
                artifactBuffer = artifactBuffer.slice(-20);
              }
            }
          }
        }

        // Flush remaining buffer
        if (artifactBuffer.trim() && !inArtifact) {
          send(controller, { type: "text", content: artifactBuffer });
        }

        // Persist assistant message
        const assistantMsgId = randomUUID();
        await db.messages("insertOne", {
          document: {
            id: assistantMsgId,
            conversationId: convId,
            role: "assistant",
            content: fullContent,
            timestamp: new Date().toISOString(),
          },
        });

        // Persist each artifact
        for (const artifact of artifacts) {
          await db.artifacts("insertOne", {
            document: {
              ...artifact,
              messageId: assistantMsgId,
              createdAt: new Date().toISOString(),
            },
          });
        }

        send(controller, { type: "done", content: convId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        send(controller, { type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
