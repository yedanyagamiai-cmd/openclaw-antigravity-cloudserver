import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  SERVER_NAME,
  SERVER_VERSION,
  MODELS,
} from "./constants.js";
import { corsHeaders, jsonRpcError } from "./helpers.js";
import { checkRateLimit } from "./rate-limit.js";
import { handleMcpRequest } from "./mcp.js";
import { handleAiChat, chatSchema } from "./tools/chat.js";
import { imageSchema } from "./tools/image.js";
import { landingPage } from "./landing.js";
import type { Env, JsonRpcRequest } from "./types.js";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

// ── CORS middleware ──────────────────────────────────────────
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "Mcp-Session-Id"],
  exposeHeaders: ["Mcp-Session-Id"],
}));

// ── Landing page ─────────────────────────────────────────────
app.get("/", (c) => {
  const origin = new URL(c.req.url).origin;
  return landingPage(origin);
});

// ── Health check ─────────────────────────────────────────────
app.get("/health", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json({
    status: "operational",
    name: SERVER_NAME,
    version: SERVER_VERSION,
    tools: 8,
    models: Object.keys(MODELS).length,
    cost: "$0/day",
    mcp_endpoint: `${origin}/mcp`,
    sse_endpoint: `${origin}/sse`,
  });
});

// ── MCP Streamable HTTP endpoint ─────────────────────────────
app.post("/mcp", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  try {
    const body = (await c.req.json()) as JsonRpcRequest;
    const result = await handleMcpRequest(body, c.env, ip);
    if (!result) return c.body("", 202);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json(jsonRpcError(null, -32700, `Parse error: ${message}`), 400);
  }
});

// ── SSE endpoint (for MCP Inspector) ─────────────────────────
app.get("/sse", (c) => {
  const sessionId = crypto.randomUUID();
  const origin = new URL(c.req.url).origin;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  c.executionCtx.waitUntil(
    (async () => {
      try {
        await writer.write(
          encoder.encode(
            `event: endpoint\ndata: ${origin}/sse/message?session=${sessionId}\n\n`,
          ),
        );
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          await writer.write(encoder.encode(`: keepalive\n\n`));
        }
      } catch {
        // Client disconnected
      } finally {
        try {
          await writer.close();
        } catch {
          // Already closed
        }
      }
    })(),
  );

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Mcp-Session-Id": sessionId,
      ...corsHeaders(),
    },
  });
});

// ── SSE message endpoint ─────────────────────────────────────
app.post("/sse/message", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  try {
    const body = (await c.req.json()) as JsonRpcRequest;
    const result = await handleMcpRequest(body, c.env, ip);
    if (!result) return c.body("", 202);

    const eventData = `data: ${JSON.stringify(result)}\n\n`;
    return new Response(eventData, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...corsHeaders(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const errorEvent = `data: ${JSON.stringify(jsonRpcError(null, -32700, message))}\n\n`;
    return new Response(errorEvent, {
      headers: { "Content-Type": "text/event-stream", ...corsHeaders() },
    });
  }
});

// ── SSE POST (legacy) ────────────────────────────────────────
app.post("/sse", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  try {
    const body = (await c.req.json()) as JsonRpcRequest;
    const result = await handleMcpRequest(body, c.env, ip);
    if (!result) return c.body("", 202);

    const eventData = `data: ${JSON.stringify(result)}\n\n`;
    return new Response(eventData, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        ...corsHeaders(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const errorEvent = `data: ${JSON.stringify(jsonRpcError(null, -32700, message))}\n\n`;
    return new Response(errorEvent, {
      headers: { "Content-Type": "text/event-stream", ...corsHeaders() },
    });
  }
});

// ── REST API: Chat ───────────────────────────────────────────
app.post("/api/chat", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const rl = await checkRateLimit(c.env.KV, ip);
  if (!rl.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  try {
    const raw = await c.req.json();
    const args = chatSchema.parse(raw);
    const result = await handleAiChat(args, c.env);
    const text = result.content[0]?.text;
    return c.json(text ? JSON.parse(text) : result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── REST API: Image ──────────────────────────────────────────
app.post("/api/image", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const rl = await checkRateLimit(c.env.KV, ip);
  if (!rl.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  try {
    const raw = await c.req.json();
    const args = imageSchema.parse(raw);
    const aiRunner = c.env.AI as { run: (model: string, input: Record<string, unknown>) => Promise<ReadableStream> };
    const result = await aiRunner.run(MODELS.image, {
      prompt: args.prompt,
      num_steps: args.steps ?? 4,
    });
    return new Response(result, {
      headers: { "Content-Type": "image/png", ...corsHeaders() },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// ── Models endpoint (OpenAI-compatible) ──────────────────────
app.get("/v1/models", (c) => {
  return c.json({
    object: "list",
    data: Object.entries(MODELS).map(([key, model]) => ({
      id: key,
      object: "model",
      created: 1709856000,
      owned_by: "openclaw-antigravity",
      description: model,
      pricing: { input: 0, output: 0 },
    })),
  });
});

// ── 404 ──────────────────────────────────────────────────────
app.notFound((c) => {
  const origin = new URL(c.req.url).origin;
  return c.json(
    {
      error: "Not found",
      endpoints: [
        "/",
        "/mcp",
        "/sse",
        "/health",
        "/api/chat",
        "/api/image",
        "/v1/models",
      ],
      docs: origin,
    },
    404,
  );
});

// ── Global error handler ─────────────────────────────────────
app.onError((err, c) => {
  console.error(`[${SERVER_NAME}] Error:`, err.message);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
