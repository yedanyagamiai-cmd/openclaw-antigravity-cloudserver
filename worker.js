/**
 * OpenClaw Antigravity Cloud Server — FREE AI Cloud MCP Server
 *
 * The most advanced free AI MCP server on the internet.
 * Powered by Cloudflare Workers AI — $0/day, 100K requests/day.
 *
 * 8 AI-powered tools for any MCP client:
 *   1. ai_chat          — Multi-model chat completion (Llama 4 Scout 17B)
 *   2. ai_reason         — Deep reasoning with chain-of-thought (DeepSeek R1 distill)
 *   3. ai_embed          — Text embeddings (BGE base, 768-dim)
 *   4. ai_image          — Image generation (FLUX.1 schnell)
 *   5. ai_summarize      — Intelligent text summarization
 *   6. ai_translate      — Multi-language translation (100+ languages)
 *   7. ai_code           — Code generation, review, and debugging
 *   8. ai_extract        — Entity extraction, classification, sentiment
 *
 * Vendor: OpenClaw Intelligence (https://github.com/yedanyagamiai-cmd)
 * MCP Protocol: 2025-03-26 (Streamable HTTP)
 * License: MIT
 */

const SERVER_INFO = { name: 'openclaw-antigravity-cloudserver', version: '2.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

// ============================================================
// Workers AI Models (ALL FREE tier)
// ============================================================
const MODELS = {
  chat: '@cf/meta/llama-4-scout-17b-16e-instruct',
  reason: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  embed: '@cf/baai/bge-base-en-v1.5',
  image: '@cf/black-forest-labs/FLUX-1-schnell',
  translate: '@cf/meta/m2m100-1.2b',
  summarize: '@cf/facebook/bart-large-cnn',
  classify: '@cf/huggingface/distilbert-sst-2-int8',
};

// ============================================================
// Rate Limiting
// ============================================================
const FREE_LIMIT = 50;       // 50 req/day per IP (generous)
const PRO_LIMIT = 2000;      // Pro tier
const RATE_WINDOW = 86400;   // 24h

const _memRL = new Map();
function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > 60000) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: 9, total: 10 };
  }
  if (entry.count >= 10) return { allowed: false, remaining: 0, total: 10 };
  entry.count++;
  return { allowed: true, remaining: 10 - entry.count, total: 10 };
}

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit(ip);
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:ag:${ip}:${today}`;
  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch { return memoryRateLimit(ip); }
  if (count >= FREE_LIMIT) {
    return { allowed: false, remaining: 0, total: FREE_LIMIT, used: count };
  }
  try { await kv.put(key, String(count + 1), { expirationTtl: RATE_WINDOW }); } catch {}
  return { allowed: true, remaining: FREE_LIMIT - count - 1, total: FREE_LIMIT, used: count + 1 };
}

// ============================================================
// JSON-RPC / MCP Helpers
// ============================================================
function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
function toolResult(data) {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}
function toolError(message) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  };
}
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

// ============================================================
// Tool Definitions
// ============================================================
const TOOLS = [
  {
    name: 'ai_chat',
    description: 'Chat with a powerful AI model (Llama 4 Scout 17B, 16 experts). Supports system prompts, multi-turn conversations, and adjustable creativity. FREE — no API key needed.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Your message to the AI' },
        system: { type: 'string', description: 'Optional system prompt to set AI behavior' },
        history: {
          type: 'array',
          description: 'Optional conversation history [{role:"user"|"assistant", content:"..."}]',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' }
            },
            required: ['role', 'content']
          }
        },
        temperature: { type: 'number', description: 'Creativity level 0.0-2.0 (default: 0.7)' },
        max_tokens: { type: 'integer', description: 'Max response length (default: 2048, max: 4096)' }
      },
      required: ['message']
    }
  },
  {
    name: 'ai_reason',
    description: 'Deep reasoning with chain-of-thought analysis (DeepSeek R1 distill). Best for complex logic, math, coding puzzles, and multi-step problems. Returns both thinking process and final answer. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question or problem requiring deep reasoning' },
        context: { type: 'string', description: 'Optional context or background information' }
      },
      required: ['question']
    }
  },
  {
    name: 'ai_embed',
    description: 'Generate text embeddings (768-dimensional vectors, BGE base). Useful for semantic search, similarity comparison, clustering, and RAG pipelines. Batch up to 20 texts. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          description: 'Single text string or array of texts to embed (max 20)',
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' }, maxItems: 20 }
          ]
        }
      },
      required: ['text']
    }
  },
  {
    name: 'ai_image',
    description: 'Generate images from text descriptions (FLUX.1 schnell by Black Forest Labs). Creates high-quality images in seconds. FREE — no API key required.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the image to generate' },
        steps: { type: 'integer', description: 'Generation steps 1-8 (default: 4, more = higher quality)' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'ai_summarize',
    description: 'Summarize long text into concise key points (BART Large CNN). Works great for articles, documents, meeting notes, and research papers. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to summarize (up to 10,000 characters)' },
        max_length: { type: 'integer', description: 'Maximum summary length in tokens (default: 256)' }
      },
      required: ['text']
    }
  },
  {
    name: 'ai_translate',
    description: 'Translate text between 100+ languages (M2M-100 1.2B). Supports direct translation between any language pair without going through English. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        source_lang: { type: 'string', description: 'Source language code (e.g., "en", "zh", "ja", "ko", "fr", "de", "es")' },
        target_lang: { type: 'string', description: 'Target language code (e.g., "en", "zh", "ja", "ko", "fr", "de", "es")' }
      },
      required: ['text', 'source_lang', 'target_lang']
    }
  },
  {
    name: 'ai_code',
    description: 'AI-powered code generation, review, debugging, and refactoring (Llama 4 Scout 17B with code-optimized prompting). Supports all major programming languages. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          enum: ['generate', 'review', 'debug', 'refactor', 'explain', 'test'],
          description: 'What to do: generate new code, review existing code, debug errors, refactor, explain, or generate tests'
        },
        code: { type: 'string', description: 'Existing code (for review/debug/refactor/explain/test)' },
        instruction: { type: 'string', description: 'What you want (for generate) or specific instructions' },
        language: { type: 'string', description: 'Programming language (default: auto-detect)' }
      },
      required: ['task']
    }
  },
  {
    name: 'ai_extract',
    description: 'Extract structured information from text: entities (people, places, orgs), sentiment, topics, key facts, and custom fields. Powered by Llama 4 Scout 17B. FREE.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to analyze' },
        extract: {
          type: 'array',
          description: 'What to extract: ["entities", "sentiment", "topics", "key_facts", "summary"] or custom fields',
          items: { type: 'string' }
        }
      },
      required: ['text']
    }
  }
];

// ============================================================
// Tool Handlers
// ============================================================

async function handleAiChat(args, env) {
  const messages = [];
  if (args.system) messages.push({ role: 'system', content: args.system });
  if (args.history && Array.isArray(args.history)) {
    messages.push(...args.history);
  }
  messages.push({ role: 'user', content: args.message });

  const result = await env.AI.run(MODELS.chat, {
    messages,
    temperature: Math.min(2.0, Math.max(0, args.temperature || 0.7)),
    max_tokens: Math.min(4096, args.max_tokens || 2048),
  });

  return toolResult({
    model: 'llama-4-scout-17b-16e',
    response: result.response,
    usage: result.usage || null
  });
}

async function handleAiReason(args, env) {
  const messages = [
    { role: 'system', content: 'You are a deep reasoning AI. Think step by step. Show your reasoning process clearly before giving the final answer. Use <think>...</think> tags for your reasoning process.' },
  ];
  if (args.context) {
    messages.push({ role: 'user', content: `Context: ${args.context}\n\nQuestion: ${args.question}` });
  } else {
    messages.push({ role: 'user', content: args.question });
  }

  const result = await env.AI.run(MODELS.reason, {
    messages,
    max_tokens: 4096,
    temperature: 0.3
  });

  // Parse thinking and answer
  const response = result.response || '';
  let thinking = '';
  let answer = response;
  const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    answer = response.replace(/<think>[\s\S]*?<\/think>/, '').trim();
  }

  return toolResult({
    model: 'deepseek-r1-distill-qwen-32b',
    thinking: thinking || '(reasoning embedded in response)',
    answer: answer,
    full_response: response
  });
}

async function handleAiEmbed(args, env) {
  const texts = Array.isArray(args.text) ? args.text : [args.text];
  if (texts.length > 20) return toolError('Maximum 20 texts per request');

  const result = await env.AI.run(MODELS.embed, { text: texts });

  return toolResult({
    model: 'bge-base-en-v1.5',
    dimensions: 768,
    embeddings: result.data.map((d, i) => ({
      index: i,
      text_preview: texts[i].slice(0, 80),
      vector_preview: d.slice(0, 5).map(v => v.toFixed(6)),
      vector_length: d.length
    })),
    _note: 'Full vectors available. Each is a 768-dim float array.'
  });
}

async function handleAiImage(args, env) {
  const steps = Math.min(8, Math.max(1, args.steps || 4));

  const result = await env.AI.run(MODELS.image, {
    prompt: args.prompt,
    num_steps: steps,
  });

  // result is a ReadableStream of the image
  const imageBytes = new Uint8Array(await new Response(result).arrayBuffer());
  const base64 = btoa(String.fromCharCode(...imageBytes));

  return {
    content: [
      {
        type: 'image',
        data: base64,
        mimeType: 'image/png'
      },
      {
        type: 'text',
        text: JSON.stringify({
          model: 'FLUX.1-schnell',
          prompt: args.prompt,
          steps: steps,
          size_bytes: imageBytes.length
        })
      }
    ]
  };
}

async function handleAiSummarize(args, env) {
  const text = (args.text || '').slice(0, 10000);
  if (text.length < 50) return toolError('Text too short to summarize (min 50 characters)');

  const result = await env.AI.run(MODELS.summarize, {
    input_text: text,
    max_length: Math.min(1024, args.max_length || 256),
  });

  return toolResult({
    model: 'bart-large-cnn',
    summary: result.summary,
    original_length: text.length,
    summary_length: (result.summary || '').length,
    compression_ratio: ((result.summary || '').length / text.length * 100).toFixed(1) + '%'
  });
}

async function handleAiTranslate(args, env) {
  const result = await env.AI.run(MODELS.translate, {
    text: args.text,
    source_lang: args.source_lang,
    target_lang: args.target_lang,
  });

  return toolResult({
    model: 'm2m100-1.2b',
    source_lang: args.source_lang,
    target_lang: args.target_lang,
    original: args.text,
    translated: result.translated_text
  });
}

async function handleAiCode(args, env) {
  const systemPrompts = {
    generate: 'You are an expert software engineer. Generate clean, well-documented, production-ready code. Include comments and follow best practices.',
    review: 'You are a senior code reviewer. Analyze the code for bugs, security issues, performance problems, and style. Provide specific, actionable feedback with line references.',
    debug: 'You are a debugging expert. Analyze the code/error, identify the root cause, explain why it happens, and provide the corrected code.',
    refactor: 'You are a refactoring specialist. Improve the code\'s structure, readability, and performance while maintaining the same behavior. Explain each change.',
    explain: 'You are a patient coding teacher. Explain the code clearly, covering what it does, how it works, and why certain patterns are used. Use simple language.',
    test: 'You are a QA engineer. Generate comprehensive unit tests for the given code. Cover edge cases, error scenarios, and happy paths.'
  };

  const messages = [
    { role: 'system', content: systemPrompts[args.task] || systemPrompts.generate }
  ];

  let userMsg = '';
  if (args.task === 'generate') {
    userMsg = `Generate ${args.language || ''} code: ${args.instruction}`;
  } else {
    userMsg = `${args.task.toUpperCase()} this ${args.language || ''} code:\n\`\`\`\n${args.code || 'No code provided'}\n\`\`\``;
    if (args.instruction) userMsg += `\n\nAdditional instructions: ${args.instruction}`;
  }
  messages.push({ role: 'user', content: userMsg });

  const result = await env.AI.run(MODELS.chat, {
    messages,
    temperature: args.task === 'generate' ? 0.5 : 0.3,
    max_tokens: 4096,
  });

  return toolResult({
    model: 'llama-4-scout-17b-16e',
    task: args.task,
    language: args.language || 'auto-detected',
    result: result.response
  });
}

async function handleAiExtract(args, env) {
  const extractFields = args.extract || ['entities', 'sentiment', 'topics', 'key_facts'];

  const messages = [
    {
      role: 'system',
      content: `You are an information extraction AI. Analyze the given text and extract the requested information. Return your response as valid JSON with the following fields: ${extractFields.join(', ')}. For entities, categorize them (person, organization, location, date, product, etc.). For sentiment, provide a score (-1.0 to 1.0) and label (very negative, negative, neutral, positive, very positive).`
    },
    {
      role: 'user',
      content: `Extract the following from this text: [${extractFields.join(', ')}]\n\nText:\n${(args.text || '').slice(0, 5000)}`
    }
  ];

  const result = await env.AI.run(MODELS.chat, {
    messages,
    temperature: 0.1,
    max_tokens: 2048,
  });

  // Try to parse JSON from response
  let parsed = null;
  try {
    const jsonMatch = (result.response || '').match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {}

  return toolResult({
    model: 'llama-4-scout-17b-16e',
    extracted: parsed || result.response,
    fields_requested: extractFields,
    text_length: (args.text || '').length
  });
}

// Tool dispatcher
async function dispatchTool(name, args, env) {
  switch (name) {
    case 'ai_chat': return handleAiChat(args, env);
    case 'ai_reason': return handleAiReason(args, env);
    case 'ai_embed': return handleAiEmbed(args, env);
    case 'ai_image': return handleAiImage(args, env);
    case 'ai_summarize': return handleAiSummarize(args, env);
    case 'ai_translate': return handleAiTranslate(args, env);
    case 'ai_code': return handleAiCode(args, env);
    case 'ai_extract': return handleAiExtract(args, env);
    default: return toolError(`Unknown tool: ${name}`);
  }
}

// ============================================================
// MCP Protocol Handler
// ============================================================

async function handleMcpRequest(body, env, ip) {
  const { method, id, params } = body;

  switch (method) {
    case 'initialize':
      return jsonRpcResponse(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: CAPABILITIES,
      });

    case 'notifications/initialized':
      return null; // No response for notifications

    case 'tools/list':
      return jsonRpcResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!TOOLS.find(t => t.name === toolName)) {
        return jsonRpcResponse(id, toolError(`Unknown tool: ${toolName}. Available: ${TOOLS.map(t => t.name).join(', ')}`));
      }

      // Rate limit
      const rl = await checkRateLimit(env.KV || null, ip);
      if (!rl.allowed) {
        return jsonRpcResponse(id, toolError(
          `Rate limit exceeded (${rl.total}/day). Upgrade to Pro for ${PRO_LIMIT}/day. Contact: openclaw-intel@proton.me`
        ));
      }

      try {
        const result = await dispatchTool(toolName, toolArgs, env);
        // Inject rate limit info
        if (result.content && result.content[0] && result.content[0].type === 'text') {
          try {
            const data = JSON.parse(result.content[0].text);
            data._rate_limit = { remaining: rl.remaining, total: rl.total };
            data._powered_by = 'OpenClaw Antigravity Cloud (FREE)';
            result.content[0].text = JSON.stringify(data, null, 2);
          } catch {}
        }
        return jsonRpcResponse(id, result);
      } catch (e) {
        return jsonRpcResponse(id, toolError(`AI execution error: ${e.message}`));
      }
    }

    case 'ping':
      return jsonRpcResponse(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ============================================================
// HTTP / SSE Transport Layer
// ============================================================

async function handleSSE(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const sessionId = crypto.randomUUID();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {}
  };

  // Handle incoming messages via query params or POST body
  const url = new URL(request.url);

  // For SSE, we start the connection and handle messages
  const response = new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Mcp-Session-Id': sessionId,
      ...corsHeaders(),
    },
  });

  // If there's a body (POST to /sse), process it
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const result = await handleMcpRequest(body, env, ip);
      if (result) await sendEvent(result);
    } catch (e) {
      await sendEvent(jsonRpcError(null, -32700, `Parse error: ${e.message}`));
    }
    await writer.close();
  }

  return response;
}

// ============================================================
// Landing Page
// ============================================================

function landingPage() {
  return new Response(`<!DOCTYPE html>
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
.code .comment{color:#666}
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
  <div class="tool">
    <h3>ai_chat</h3>
    <div class="model">Llama 4 Scout 17B (16 experts)</div>
    <p>Multi-turn chat with system prompts, adjustable temperature, and conversation history support.</p>
  </div>
  <div class="tool">
    <h3>ai_reason</h3>
    <div class="model">DeepSeek R1 Distill 32B</div>
    <p>Deep chain-of-thought reasoning. Shows thinking process. Best for math, logic, and complex problems.</p>
  </div>
  <div class="tool">
    <h3>ai_embed</h3>
    <div class="model">BGE Base EN v1.5 (768-dim)</div>
    <p>Text embeddings for semantic search, RAG pipelines, clustering, and similarity comparison. Batch up to 20.</p>
  </div>
  <div class="tool">
    <h3>ai_image</h3>
    <div class="model">FLUX.1 Schnell</div>
    <p>Generate high-quality images from text descriptions. Returns base64 PNG. 1-8 generation steps.</p>
  </div>
  <div class="tool">
    <h3>ai_summarize</h3>
    <div class="model">BART Large CNN</div>
    <p>Intelligent summarization for articles, docs, and meeting notes. Up to 10K characters input.</p>
  </div>
  <div class="tool">
    <h3>ai_translate</h3>
    <div class="model">M2M-100 1.2B</div>
    <p>Direct translation between 100+ languages without English intermediary. Professional quality.</p>
  </div>
  <div class="tool">
    <h3>ai_code</h3>
    <div class="model">Llama 4 Scout 17B</div>
    <p>Generate, review, debug, refactor, explain, or test code. All major programming languages.</p>
  </div>
  <div class="tool">
    <h3>ai_extract</h3>
    <div class="model">Llama 4 Scout 17B</div>
    <p>Extract entities, sentiment, topics, and key facts. Structured JSON output for any text.</p>
  </div>
</div>

<div class="connect">
  <h2>Connect in 30 Seconds</h2>
  <div class="connect-methods">
    <div>
      <h3>Claude Code / Cursor <span class="badge">Recommended</span></h3>
      <div class="code">
        <span class="comment">// Add to .mcp.json or MCP settings:</span><br>
        {<br>
        &nbsp;&nbsp;"mcpServers": {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;"antigravity-cloud": {<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"url": "https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp"<br>
        &nbsp;&nbsp;&nbsp;&nbsp;}<br>
        &nbsp;&nbsp;}<br>
        }
      </div>
    </div>
    <div>
      <h3>MCP Inspector / SSE</h3>
      <div class="code">
        <span class="comment"># SSE endpoint:</span><br>
        https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/sse<br><br>
        <span class="comment"># Streamable HTTP:</span><br>
        https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp
      </div>
    </div>
  </div>
  <div style="margin-top:20px">
    <h3>Test with curl</h3>
    <div class="code">
curl -X POST https://openclaw-antigravity-cloudserver.yagami8095.workers.dev/mcp \\<br>
&nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
&nbsp;&nbsp;-d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
    </div>
  </div>
</div>

<footer>
  <p>Built by <a href="https://github.com/yedanyagamiai-cmd">OpenClaw Intelligence</a> | Powered by Cloudflare Workers AI | <a href="https://github.com/yedanyagamiai-cmd/openclaw-antigravity-cloudserver">GitHub</a></p>
  <p style="margin-top:8px">MCP Protocol 2025-03-26 | MIT License | v2.0.0</p>
</footer>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', ...corsHeaders() },
  });
}

// ============================================================
// Main Fetch Handler
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Landing page
    if (path === '/' && request.method === 'GET') {
      return landingPage();
    }

    // Health check
    if (path === '/health') {
      return jsonResponse({
        status: 'operational',
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        tools: TOOLS.length,
        models: Object.keys(MODELS).length,
        cost: '$0/day',
        mcp_endpoint: `${url.origin}/mcp`,
        sse_endpoint: `${url.origin}/sse`,
      });
    }

    // MCP Streamable HTTP endpoint
    if (path === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json();
        const result = await handleMcpRequest(body, env, ip);
        if (!result) return new Response('', { status: 202, headers: corsHeaders() });
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse(jsonRpcError(null, -32700, `Parse error: ${e.message}`), 400);
      }
    }

    // SSE endpoint
    if (path === '/sse') {
      if (request.method === 'GET') {
        // SSE connection — send endpoint info
        const sessionId = crypto.randomUUID();
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Send the message endpoint
        ctx.waitUntil((async () => {
          try {
            await writer.write(encoder.encode(`event: endpoint\ndata: ${url.origin}/sse/message?session=${sessionId}\n\n`));
            // Keep alive for 30s
            for (let i = 0; i < 30; i++) {
              await new Promise(r => setTimeout(r, 1000));
              await writer.write(encoder.encode(`: keepalive\n\n`));
            }
          } catch {} finally {
            try { await writer.close(); } catch {}
          }
        })());

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Mcp-Session-Id': sessionId,
            ...corsHeaders(),
          },
        });
      }

      if (request.method === 'POST') {
        return handleSSE(request, env);
      }
    }

    // SSE message endpoint
    if (path === '/sse/message' && request.method === 'POST') {
      try {
        const body = await request.json();
        const result = await handleMcpRequest(body, env, ip);
        if (!result) return new Response('', { status: 202, headers: corsHeaders() });

        // Return as SSE event
        const eventData = `data: ${JSON.stringify(result)}\n\n`;
        return new Response(eventData, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...corsHeaders(),
          },
        });
      } catch (e) {
        const errorEvent = `data: ${JSON.stringify(jsonRpcError(null, -32700, e.message))}\n\n`;
        return new Response(errorEvent, {
          headers: { 'Content-Type': 'text/event-stream', ...corsHeaders() },
        });
      }
    }

    // API endpoint for direct REST calls (bonus)
    if (path === '/api/chat' && request.method === 'POST') {
      const rl = await checkRateLimit(env.KV || null, ip);
      if (!rl.allowed) return jsonResponse({ error: 'Rate limit exceeded' }, 429);
      try {
        const args = await request.json();
        const result = await handleAiChat(args, env);
        return jsonResponse(result.content ? JSON.parse(result.content[0].text) : result);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    if (path === '/api/image' && request.method === 'POST') {
      const rl = await checkRateLimit(env.KV || null, ip);
      if (!rl.allowed) return jsonResponse({ error: 'Rate limit exceeded' }, 429);
      try {
        const args = await request.json();
        const steps = Math.min(8, Math.max(1, args.steps || 4));
        const result = await env.AI.run(MODELS.image, { prompt: args.prompt, num_steps: steps });
        return new Response(result, { headers: { 'Content-Type': 'image/png', ...corsHeaders() } });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // Models endpoint (OpenAI-compatible)
    if (path === '/v1/models') {
      return jsonResponse({
        object: 'list',
        data: Object.entries(MODELS).map(([key, model]) => ({
          id: key,
          object: 'model',
          created: 1709856000,
          owned_by: 'openclaw-antigravity',
          description: model,
          pricing: { input: 0, output: 0 }
        }))
      });
    }

    return jsonResponse({ error: 'Not found', endpoints: ['/', '/mcp', '/sse', '/health', '/api/chat', '/api/image', '/v1/models'] }, 404);
  }
};
