# openclaw-antigravity-cloudserver

**8 free AI tools for Claude Code, Cursor, and any MCP client — powered by Cloudflare Workers AI.**

No API key. No sign-up. No rate limit worries. Just add the URL and start using AI tools.

[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Cost](https://img.shields.io/badge/cost-%240%2Fday-brightgreen)]()

## Quick Start

Add this to your MCP config and you're done:

**Claude Code** — `.mcp.json`:
```json
{
  "mcpServers": {
    "antigravity-cloud": {
      "url": "https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp"
    }
  }
}
```

**Cursor / Windsurf** — same URL in your MCP settings.

**MCP Inspector** — SSE endpoint:
```
https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/sse
```

**Test with curl:**
```bash
curl -X POST https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Tools

| Tool | Model | What it does |
|------|-------|-------------|
| **`ai_chat`** | Llama 4 Scout 17B (16 experts) | Multi-turn chat with system prompts, conversation history, adjustable temperature |
| **`ai_reason`** | DeepSeek R1 Distill 32B | Deep chain-of-thought reasoning with thinking/answer separation |
| **`ai_code`** | Llama 4 Scout 17B | Generate, review, debug, refactor, explain, or test code |
| **`ai_image`** | FLUX.1 Schnell | Text-to-image generation, returns base64 PNG |
| **`ai_embed`** | BGE Base EN v1.5 | 768-dim text embeddings, batch up to 20 texts |
| **`ai_summarize`** | BART Large CNN | Summarize articles, docs, meeting notes (up to 10K chars) |
| **`ai_translate`** | M2M-100 1.2B | Direct translation between 100+ languages |
| **`ai_extract`** | Llama 4 Scout 17B | Extract entities, sentiment, topics, key facts from text |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page with documentation |
| `/mcp` | POST | MCP Streamable HTTP (JSON-RPC 2.0) |
| `/sse` | GET | SSE transport for MCP Inspector |
| `/health` | GET | Server health and status |
| `/api/chat` | POST | REST API for chat (direct JSON) |
| `/api/image` | POST | REST API for image generation (returns PNG) |
| `/v1/models` | GET | OpenAI-compatible models list |

## Architecture

```
┌──────────────┐     MCP (HTTP)     ┌──────────────────────────┐     Workers AI
│ Claude Code  │ ◀──────────────▶   │  Hono + TypeScript       │ ◀──────────▶  Cloudflare AI
│ Cursor       │  JSON-RPC 2.0     │  Zod validation          │   (FREE)      Models
│ Any MCP      │                    │  Rate limiting (KV)      │
│ Client       │                    │  8 tool handlers         │
└──────────────┘                    └──────────────────────────┘
```

- **Framework**: Hono for routing, middleware, error handling
- **Validation**: Zod schemas on every tool input
- **Rate Limiting**: 50 req/day per IP (KV-backed) + 10 req/min memory fallback
- **Transport**: Streamable HTTP (`/mcp`) + SSE (`/sse`) for MCP Inspector
- **Base64 Fix**: Chunked encoding prevents `btoa` stack overflow on large images
- **Error Handling**: Custom `McpError` hierarchy, no empty catch blocks
- **TypeScript**: Strict mode, 0 errors, ESLint flat config

## Rate Limits

| Tier | Limit | How |
|------|-------|-----|
| Free | 50 req/day per IP | Automatic (no key needed) |
| Memory fallback | 10 req/min | When KV not configured |

## Self-Hosting

Fork and deploy your own instance:

```bash
git clone https://github.com/yedanyagamiai-cmd/openclaw-antigravity-cloudserver
cd openclaw-antigravity-cloudserver
npm install
npx wrangler dev        # local development
npx wrangler deploy     # deploy to your CF account
```

The only requirement is a Cloudflare account with Workers AI enabled (free tier).

## Development

```bash
npm run dev           # wrangler dev server
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run test          # vitest
```

## FAQ

**Q: Is this really free?**
Yes. Cloudflare Workers AI provides free-tier access to all models used. The server itself runs on Workers free tier (100K req/day).

**Q: Do I need an API key?**
No. The server is fully open. Rate limiting is per-IP to prevent abuse.

**Q: What's the difference from the `openclaw-antigravity-mcp` npm package?**
The npm package (`openclaw-antigravity-mcp`) runs locally and bridges to your local Antigravity proxy for Claude/Gemini access. This cloud server runs on Cloudflare and provides Workers AI models (Llama, DeepSeek, FLUX) — different models, no local setup needed.

**Q: Can I use both?**
Yes! They provide different models and complement each other.

## License

MIT — [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd)
