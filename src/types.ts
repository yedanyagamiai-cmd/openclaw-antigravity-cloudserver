/** Cloudflare Worker environment bindings */
export interface Env {
  AI: Ai;
  KV?: KVNamespace;
}

/** MCP tool result content block */
export interface ToolContent {
  type: "text" | "image";
  text?: string;
  data?: string;
  mimeType?: string;
}

/** MCP tool execution result */
export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
}

/** Rate limit check result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  used?: number;
}

/** JSON-RPC 2.0 request */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/** MCP tool definition */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
