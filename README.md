# OpenClaw Antigravity Cloud Server

**The most advanced free AI MCP server on the internet.**

8 powerful AI tools via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), powered by Cloudflare Workers AI. **No API key required. $0 cost. 50 requests/day free.**

[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Workers AI](https://img.shields.io/badge/Workers%20AI-FREE-orange)](https://developers.cloudflare.com/workers-ai/)

## Quick Start (30 seconds)

### Claude Code / Cursor / Windsurf

Add to your MCP settings:

```json
{
  "mcpServers": {
    "antigravity-cloud": {
      "url": "https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp"
    }
  }
}
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
# Enter: https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/sse
```

### Test with curl

```bash
curl -X POST https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 8 AI Tools

| Tool | Model | Description |
|------|-------|-------------|
| `ai_chat` | Llama 4 Scout 17B (16 experts) | Multi-turn chat with system prompts and temperature control |
| `ai_reason` | DeepSeek R1 Distill 32B | Deep chain-of-thought reasoning with thinking process |
| `ai_embed` | BGE Base EN v1.5 | 768-dim text embeddings, batch up to 20 texts |
| `ai_image` | FLUX.1 Schnell | Text-to-image generation, returns base64 PNG |
| `ai_summarize` | BART Large CNN | Intelligent text summarization up to 10K chars |
| `ai_translate` | M2M-100 1.2B | Direct translation between 100+ languages |
| `ai_code` | Llama 4 Scout 17B | Generate, review, debug, refactor, explain, or test code |
| `ai_extract` | Llama 4 Scout 17B | Extract entities, sentiment, topics, and key facts |

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Interactive landing page |
| `/mcp` | POST | MCP Streamable HTTP (recommended) |
| `/sse` | GET/POST | MCP SSE transport |
| `/health` | GET | Server health and stats |
| `/api/chat` | POST | Direct REST API for chat |
| `/api/image` | POST | Direct REST API for image generation |
| `/v1/models` | GET | OpenAI-compatible model list |

## Examples

### AI Chat

```json
{
  "jsonrpc": "2.0", "id": 1,
  "method": "tools/call",
  "params": {
    "name": "ai_chat",
    "arguments": {
      "message": "Explain quantum computing in simple terms",
      "system": "You are a friendly science teacher",
      "temperature": 0.7
    }
  }
}
```

### Deep Reasoning

```json
{
  "jsonrpc": "2.0", "id": 2,
  "method": "tools/call",
  "params": {
    "name": "ai_reason",
    "arguments": {
      "question": "If all roses are flowers and some flowers fade quickly, can we conclude that some roses fade quickly?",
      "context": "This is a logic problem about syllogisms."
    }
  }
}
```

### Image Generation

```json
{
  "jsonrpc": "2.0", "id": 3,
  "method": "tools/call",
  "params": {
    "name": "ai_image",
    "arguments": {
      "prompt": "A futuristic city floating in the clouds, cyberpunk style, neon lights",
      "steps": 6
    }
  }
}
```

### Code Generation

```json
{
  "jsonrpc": "2.0", "id": 4,
  "method": "tools/call",
  "params": {
    "name": "ai_code",
    "arguments": {
      "task": "generate",
      "instruction": "Create a React hook for infinite scrolling with intersection observer",
      "language": "typescript"
    }
  }
}
```

## Rate Limits

| Tier | Requests/Day | Cost |
|------|-------------|------|
| Free | 50 | $0 |
| Pro | 2,000 | Contact us |

## Self-Host

Deploy your own instance to Cloudflare Workers:

```bash
git clone https://github.com/yedanyagamiai-cmd/openclaw-antigravity-cloudserver
cd openclaw-antigravity-cloudserver
npx wrangler deploy
```

Requirements: Cloudflare account (free tier is sufficient).

## Architecture

```
MCP Client (Claude/Cursor/etc.)
  |
  | (MCP Protocol over HTTPS)
  v
Cloudflare Worker (Edge, 300+ cities)
  |
  |--- Workers AI (FREE)
  |    |--- Llama 4 Scout 17B (chat, code, extract)
  |    |--- DeepSeek R1 Distill 32B (reasoning)
  |    |--- BGE Base EN v1.5 (embeddings)
  |    |--- FLUX.1 Schnell (image gen)
  |    |--- BART Large CNN (summarization)
  |    |--- M2M-100 1.2B (translation)
  |
  |--- KV (rate limiting)
  v
Response (JSON-RPC 2.0)
```

## License

MIT License. Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd).
