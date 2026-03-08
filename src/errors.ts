/** Base error for all MCP server errors */
export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: number = -32603,
  ) {
    super(message);
    this.name = "McpError";
  }
}

/** Invalid JSON-RPC request */
export class ParseError extends McpError {
  constructor(detail?: string) {
    super(detail ? `Parse error: ${detail}` : "Parse error", -32700);
    this.name = "ParseError";
  }
}

/** Unknown JSON-RPC method */
export class MethodNotFoundError extends McpError {
  constructor(method: string) {
    super(`Method not found: ${method}`, -32601);
    this.name = "MethodNotFoundError";
  }
}

/** Invalid method parameters */
export class InvalidParamsError extends McpError {
  constructor(detail: string) {
    super(`Invalid params: ${detail}`, -32602);
    this.name = "InvalidParamsError";
  }
}

/** Rate limit exceeded */
export class RateLimitError extends McpError {
  constructor(limit: number) {
    super(
      `Rate limit exceeded (${limit}/day). Upgrade to Pro for 2000/day. Contact: openclaw-intel@proton.me`,
      -32000,
    );
    this.name = "RateLimitError";
  }
}

/** Tool execution error */
export class ToolExecutionError extends McpError {
  constructor(detail: string) {
    super(`AI execution error: ${detail}`, -32001);
    this.name = "ToolExecutionError";
  }
}
