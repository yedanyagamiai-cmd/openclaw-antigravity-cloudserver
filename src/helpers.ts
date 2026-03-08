import type { ToolContent, ToolResult } from "./types.js";

/** JSON-RPC 2.0 success response */
export function jsonRpcResponse(
  id: string | number | null | undefined,
  result: unknown,
): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

/** JSON-RPC 2.0 error response */
export function jsonRpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
): Record<string, unknown> {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

/** Build a successful tool result with text content */
export function toolResult(data: unknown): ToolResult {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text }] };
}

/** Build a tool error result */
export function toolError(message: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

/** Build a tool result with image content */
export function imageResult(
  base64: string,
  metadata: Record<string, unknown>,
): ToolResult {
  const content: ToolContent[] = [
    { type: "image", data: base64, mimeType: "image/png" },
    { type: "text", text: JSON.stringify(metadata, null, 2) },
  ];
  return { content };
}

/** CORS headers — open for MCP clients */
export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, Mcp-Session-Id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  };
}

/** Inject rate limit + branding into text tool result */
export function injectMetadata(
  result: ToolResult,
  remaining: number,
  total: number,
): ToolResult {
  const first = result.content[0];
  if (first?.type !== "text" || !first.text) return result;

  try {
    const data = JSON.parse(first.text) as Record<string, unknown>;
    data["_rate_limit"] = { remaining, total };
    data["_powered_by"] = "OpenClaw Antigravity Cloud (FREE)";
    first.text = JSON.stringify(data, null, 2);
  } catch {
    // Not JSON text, skip injection
  }
  return result;
}
