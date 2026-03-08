import { SERVER_VERSION, MCP_PROTOCOL_VERSION } from "./constants.js";
import { corsHeaders } from "./helpers.js";

export function landingPage(origin: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenClaw Antigravity Cloud — Free AI MCP Server</title>
<meta name="description" content="Free AI cloud server with 8 powerful tools. Chat, reason, embed, generate images, summarize, translate, code, and extract — all powered by Workers AI. No API key required.">
<meta property="og:title" content="OpenClaw Antigravity Cloud — Free AI MCP Server">
<meta property="og:description" content="8 free AI tools via MCP protocol. Llama 4 Scout, DeepSeek R1, FLUX.1, and more.">
<meta property="og:type" content="website">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh}
.hero{text-align:center;padding:60px 20px 40px;background:linear-gradient(135deg,#0a0a2e 0%,#1a0a3e 50%,#0a1a2e 100%)}
.hero h1{font-size:2.8em;background:linear-gradient(135deg,#00d4ff,#7b2ff7,#ff6b35);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
.hero .sub{font-size:1.3em;color:#888;margin-bottom:8px}
.hero .free{display:inline-block;background:linear-gradient(135deg,#00ff88,#00d4ff);color:#000;padding:6px 20px;border-radius:20px;font-weight:700;font-size:1.1em;margin:16px 0}
.stats{display:flex;justify-content:center;gap:40px;margin:24px 0;flex-wrap:wrap}
.stat{text-align:center}
.stat .num{font-size:2em;font-weight:700;color:#00d4ff}
.stat .label{font-size:0.85em;color:#666}
.tools{max-width:1000px;margin:0 auto;padding:40px 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.tool{background:#12121f;border:1px solid #2a2a3f;border-radius:12px;padding:24px;transition:transform 0.2s,border-color 0.2s}
.tool:hover{transform:translateY(-3px);border-color:#7b2ff7}
.tool h3{color:#00d4ff;font-size:1.2em;margin-bottom:8px}
.tool .model{font-size:0.8em;color:#7b2ff7;margin-bottom:8px}
.tool p{color:#999;font-size:0.9em;line-height:1.5}
.connect{max-width:800px;margin:0 auto;padding:40px 20px;text-align:center}
.connect h2{font-size:1.8em;margin-bottom:20px;color:#fff}
.code{background:#1a1a2e;border:1px solid #333;border-radius:8px;padding:16px;text-align:left;font-family:'Fira Code',monospace;font-size:0.85em;color:#00d4ff;overflow-x:auto;margin:12px 0}
.code .c{color:#666}
.connect-methods{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:16px;margin-top:20px}
.badge{display:inline-block;background:#7b2ff7;color:#fff;padding:3px 10px;border-radius:10px;font-size:0.75em;margin-left:8px}
footer{text-align:center;padding:30px;color:#444;font-size:0.85em;border-top:1px solid #1a1a2f}
footer a{color:#7b2ff7;text-decoration:none}
</style>
</head>
<body>
<div class="hero">
  <h1>OpenClaw Antigravity Cloud</h1>
  <div class="sub">The Most Advanced Free AI MCP Server</div>
  <div class="free">100% FREE — No API Key Required</div>
  <div class="stats">
    <div class="stat"><div class="num">8</div><div class="label">AI Tools</div></div>
    <div class="stat"><div class="num">5</div><div class="label">AI Models</div></div>
    <div class="stat"><div class="num">50</div><div class="label">Free Req/Day</div></div>
    <div class="stat"><div class="num">$0</div><div class="label">Cost</div></div>
  </div>
</div>

<div class="tools">
  <div class="tool"><h3>ai_chat</h3><div class="model">Llama 4 Scout 17B (16 experts)</div><p>Multi-turn chat with system prompts, adjustable temperature, and conversation history support.</p></div>
  <div class="tool"><h3>ai_reason</h3><div class="model">DeepSeek R1 Distill 32B</div><p>Deep chain-of-thought reasoning. Shows thinking process. Best for math, logic, and complex problems.</p></div>
  <div class="tool"><h3>ai_embed</h3><div class="model">BGE Base EN v1.5 (768-dim)</div><p>Text embeddings for semantic search, RAG pipelines, clustering, and similarity comparison. Batch up to 20.</p></div>
  <div class="tool"><h3>ai_image</h3><div class="model">FLUX.1 Schnell</div><p>Generate high-quality images from text descriptions. Returns base64 PNG. 1-8 generation steps.</p></div>
  <div class="tool"><h3>ai_summarize</h3><div class="model">BART Large CNN</div><p>Intelligent summarization for articles, docs, and meeting notes. Up to 10K characters input.</p></div>
  <div class="tool"><h3>ai_translate</h3><div class="model">M2M-100 1.2B</div><p>Direct translation between 100+ languages without English intermediary. Professional quality.</p></div>
  <div class="tool"><h3>ai_code</h3><div class="model">Llama 4 Scout 17B</div><p>Generate, review, debug, refactor, explain, or test code. All major programming languages.</p></div>
  <div class="tool"><h3>ai_extract</h3><div class="model">Llama 4 Scout 17B</div><p>Extract entities, sentiment, topics, and key facts. Structured JSON output for any text.</p></div>
</div>

<div class="connect">
  <h2>Connect in 30 Seconds</h2>
  <div class="connect-methods">
    <div>
      <h3>Claude Code / Cursor <span class="badge">Recommended</span></h3>
      <div class="code">
        <span class="c">// Add to .mcp.json or MCP settings:</span><br>
        {<br>
        &nbsp;&nbsp;"mcpServers": {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;"antigravity-cloud": {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"url": "${origin}/mcp"<br>
        &nbsp;&nbsp;&nbsp;&nbsp;}<br>
        &nbsp;&nbsp;}<br>
        }
      </div>
    </div>
    <div>
      <h3>MCP Inspector / SSE</h3>
      <div class="code">
        <span class="c"># SSE endpoint:</span><br>
        ${origin}/sse<br><br>
        <span class="c"># Streamable HTTP:</span><br>
        ${origin}/mcp
      </div>
    </div>
  </div>
  <div style="margin-top:20px">
    <h3>Test with curl</h3>
    <div class="code">
curl -X POST ${origin}/mcp \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
    </div>
  </div>
</div>

<footer>
  <p>Built by <a href="https://github.com/yedanyagamiai-cmd">OpenClaw Intelligence</a> | Powered by Cloudflare Workers AI | <a href="https://github.com/yedanyagamiai-cmd/openclaw-antigravity-cloudserver">GitHub</a></p>
  <p style="margin-top:8px">MCP Protocol ${MCP_PROTOCOL_VERSION} | MIT License | v${SERVER_VERSION}</p>
</footer>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8", ...corsHeaders() },
  });
}
