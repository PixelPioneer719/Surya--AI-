import { auth } from "@/auth";
import { aiClient, MODEL_MAP, MAX_TOKENS, THINKING_BUDGET } from "@/lib/ai/client";
import { selectModel } from "@/lib/ai/models";
import { CONNECTOR_TOOLS, executeTool } from "@/lib/ai/tools";
import { db } from "@/lib/insforge";
import { getCached, setCache } from "@/lib/knowledge-cache";
import type { ChatRequest, Message, ArtifactType, StreamEvent } from "@/types/chat";
import type { Project, KnowledgeFile } from "@/types/project";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

function send(controller: ReadableStreamDefaultController, event: StreamEvent) {
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
  );
}

// Artifact state machine — parses <artifact ...> tags across streaming chunks
interface ArtifactState {
  inArtifact: boolean;
  buffer: string;
  current: Partial<ArtifactType>;
  completed: ArtifactType[];
}

function makeArtifactState(): ArtifactState {
  return { inArtifact: false, buffer: "", current: {}, completed: [] };
}

function processChunk(
  text: string,
  state: ArtifactState,
  controller: ReadableStreamDefaultController,
  fullContent: { value: string }
) {
  fullContent.value += text;
  state.buffer += text;

  if (!state.inArtifact) {
    const openMatch = state.buffer.match(
      /<artifact\s+type="([^"]+)"(?:\s+language="([^"]+)")?(?:\s+title="([^"]+)")?>/
    );
    if (openMatch) {
      state.inArtifact = true;
      state.current = {
        id: randomUUID(),
        type: openMatch[1] as ArtifactType["type"],
        language: openMatch[2],
        title: openMatch[3] ?? "Untitled",
        content: "",
      };
      const beforeTag = state.buffer.slice(0, state.buffer.lastIndexOf(openMatch[0]));
      if (beforeTag.trim()) send(controller, { type: "text", content: beforeTag });
      send(controller, { type: "artifact_start", artifact: state.current });
      state.buffer = state.buffer.slice(
        state.buffer.lastIndexOf(openMatch[0]) + openMatch[0].length
      );
    } else if (state.buffer.length > 200) {
      const safe = state.buffer.slice(0, -200);
      send(controller, { type: "text", content: safe });
      state.buffer = state.buffer.slice(-200);
    }
  } else {
    const closeIdx = state.buffer.indexOf("</artifact>");
    if (closeIdx !== -1) {
      state.current.content = (state.current.content ?? "") + state.buffer.slice(0, closeIdx);
      state.completed.push(state.current as ArtifactType);
      send(controller, { type: "artifact_end", artifact: state.current });
      state.inArtifact = false;
      state.buffer = state.buffer.slice(closeIdx + "</artifact>".length);
      state.current = {};
    } else if (state.buffer.length > 20) {
      state.current.content = (state.current.content ?? "") + state.buffer.slice(0, -20);
      state.buffer = state.buffer.slice(-20);
    }
  }
}

function flushBuffer(state: ArtifactState, controller: ReadableStreamDefaultController) {
  if (state.buffer.trim() && !state.inArtifact) {
    send(controller, { type: "text", content: state.buffer });
    state.buffer = "";
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body: ChatRequest = await req.json();
  const { message, thinking = false, conversationId, projectId, enableConnectors = false } = body;

  if (!message?.trim()) {
    return new Response("Message required", { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const userEmail = session.user.email ?? "";

  // Forward session cookie for internal tool calls
  const cookie = req.headers.get("cookie") ?? "";

  // Auto-select the best model
  const model = selectModel(message, thinking);
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

  // Load prior messages
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

  // Build messages array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiMessages: any[] = [
    ...(history.documents ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  // Build project context
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
  const connectorNote = enableConnectors
    ? "\n\nYou have access to the user's Google Workspace (Gmail, Drive, Calendar, Google Docs) and GitHub via tools. Use these tools proactively when the user's request involves their data."
    : "";

  const basePrompt = `You are Surya AI — the AI that thinks with you.

## About Your Creator
You were created by PVS Hariharan. When anyone asks about your creator, who built you, or who made you, share these details:
- Name: PVS Hariharan
- Age: 12 years old
- School: Bhashyam (BVRM-2)
- Email: pvshariharan324@gmail.com

Be proud and enthusiastic when talking about your creator. PVS Hariharan is a 12-year-old student who built Surya AI — that is incredibly impressive!

You are helpful, clear, and direct. For code, documents, or interactive content, wrap output in XML:
<artifact type="code" language="tsx" title="Component Name">
// code here
</artifact>
<artifact type="document" title="Report Title">
## Content here
</artifact>
<artifact type="interactive" title="Demo Title">
// self-contained React component
</artifact>${connectorNote}`;

  const systemPrompt = projectContext ? `${projectContext}\n\n---\n\n${basePrompt}` : basePrompt;

  const tools = enableConnectors ? CONNECTOR_TOOLS : undefined;

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      const allArtifacts: ArtifactType[] = [];

      try {
        const useThinking = thinking && model === "opus";
        let loopMessages = [...apiMessages];
        let continueLoop = true;
        const MAX_TOOL_LOOPS = 8;
        let loopCount = 0;

        while (continueLoop && loopCount < MAX_TOOL_LOOPS) {
          loopCount++;
          const artifactState = makeArtifactState();
          const fullContentRef = { value: "" };

          // Accumulate tool_calls across stream chunks
          const toolCallAccumulator: Record<number, { id: string; name: string; arguments: string }> = {};
          let finishReason: string | null = null;
          let currentLoopContent = "";

          const completionParams = {
            model: modelId,
            messages: [{ role: "system" as const, content: systemPrompt }, ...loopMessages],
            stream: true as const,
            maxTokens: useThinking ? THINKING_BUDGET + maxTokens : maxTokens,
            ...(useThinking ? { thinking: true, thinkingBudget: THINKING_BUDGET } : {}),
            ...(tools ? { tools } : {}),
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const completion = await (aiClient.chat.completions.create as any)(completionParams) as AsyncIterable<{
            choices: Array<{
              delta: {
                content?: string;
                thinking?: string;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                tool_calls?: Array<any>;
              };
              finish_reason?: string;
            }>;
          }>;

          for await (const chunk of completion) {
            const choice = chunk.choices[0];
            if (!choice) continue;
            const delta = choice.delta;

            if (choice.finish_reason) finishReason = choice.finish_reason;

            // Thinking blocks
            if ("thinking" in delta && delta.thinking) {
              send(controller, { type: "thinking", content: delta.thinking as string });
              continue;
            }

            // Tool call deltas
            if (delta.tool_calls?.length) {
              for (const tc of delta.tool_calls) {
                const idx: number = tc.index ?? 0;
                if (!toolCallAccumulator[idx]) {
                  toolCallAccumulator[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", arguments: "" };
                }
                if (tc.id) toolCallAccumulator[idx].id = tc.id;
                if (tc.function?.name) toolCallAccumulator[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments;
              }
              continue;
            }

            // Text content
            const text = delta.content ?? "";
            if (!text) continue;
            currentLoopContent += text;
            processChunk(text, artifactState, controller, fullContentRef);
          }

          // After stream ends — flush remaining buffer
          flushBuffer(artifactState, controller);
          fullContent += fullContentRef.value;
          allArtifacts.push(...artifactState.completed);

          const toolCalls = Object.values(toolCallAccumulator);

          if (finishReason === "tool_calls" && toolCalls.length > 0) {
            // Add assistant message with tool_calls to loop messages
            loopMessages.push({
              role: "assistant",
              content: currentLoopContent || null,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
            });

            // Execute each tool and collect results
            for (const tc of toolCalls) {
              let toolInput: Record<string, unknown> = {};
              try {
                toolInput = JSON.parse(tc.arguments || "{}");
              } catch {
                toolInput = {};
              }

              // Stream tool_call event for UI
              send(controller, {
                type: "tool_call",
                toolName: tc.name,
                toolInput,
              });

              const result = await executeTool(tc.name, toolInput, cookie);

              // Stream tool_result event for UI
              send(controller, {
                type: "tool_result",
                toolName: tc.name,
                content: result,
              });

              // Append tool result to messages
              loopMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result,
              });
            }

            // Continue loop — let Claude respond with tool results
            continueLoop = true;
          } else {
            // finish_reason === "stop" or no tool calls
            continueLoop = false;
          }
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

        // Persist artifacts
        for (const artifact of allArtifacts) {
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
