import {
  SERVER_NAME,
  SERVER_VERSION,
  MCP_PROTOCOL_VERSION,
  PRO_LIMIT,
} from "./constants.js";
import {
  jsonRpcResponse,
  jsonRpcError,
  toolError,
  injectMetadata,
} from "./helpers.js";
import { checkRateLimit } from "./rate-limit.js";
import { TOOLS, isValidTool, dispatchTool } from "./tools/index.js";
import type { Env, JsonRpcRequest } from "./types.js";

/** Handle a single MCP JSON-RPC request */
export async function handleMcpRequest(
  body: JsonRpcRequest,
  env: Env,
  ip: string,
): Promise<Record<string, unknown> | null> {
  const { method, id, params } = body;

  switch (method) {
    case "initialize":
      return jsonRpcResponse(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        capabilities: { tools: {} },
      });

    case "notifications/initialized":
      return null;

    case "tools/list":
      return jsonRpcResponse(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = (params?.["name"] as string) ?? "";
      const toolArgs = (params?.["arguments"] as Record<string, unknown>) ?? {};

      if (!isValidTool(toolName)) {
        return jsonRpcResponse(
          id,
          toolError(
            `Unknown tool: ${toolName}. Available: ${TOOLS.map((t) => t.name).join(", ")}`,
          ),
        );
      }

      const rl = await checkRateLimit(env.KV, ip);
      if (!rl.allowed) {
        return jsonRpcResponse(
          id,
          toolError(
            `Rate limit exceeded (${rl.total}/day). Upgrade to Pro for ${PRO_LIMIT}/day. Contact: openclaw-intel@proton.me`,
          ),
        );
      }

      try {
        const result = await dispatchTool(toolName, toolArgs, env);
        return jsonRpcResponse(id, injectMetadata(result, rl.remaining, rl.total));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonRpcResponse(id, toolError(`AI execution error: ${message}`));
      }
    }

    case "ping":
      return jsonRpcResponse(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}
