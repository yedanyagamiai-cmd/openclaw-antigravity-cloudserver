import type { Env, ToolDefinition, ToolResult } from "../types.js";
import { toolError } from "../helpers.js";
import { handleAiChat, chatSchema } from "./chat.js";
import { handleAiReason, reasonSchema } from "./reason.js";
import { handleAiEmbed, embedSchema } from "./embed.js";
import { handleAiImage, imageSchema } from "./image.js";
import { handleAiSummarize, summarizeSchema } from "./summarize.js";
import { handleAiTranslate, translateSchema } from "./translate.js";
import { handleAiCode, codeSchema } from "./code.js";
import { handleAiExtract, extractSchema } from "./extract.js";

/** All MCP tool definitions */
export const TOOLS: ToolDefinition[] = [
  {
    name: "ai_chat",
    description:
      "Chat with a powerful AI model (Llama 4 Scout 17B, 16 experts). Supports system prompts, multi-turn conversations, and adjustable creativity. FREE — no API key needed.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Your message to the AI" },
        system: { type: "string", description: "Optional system prompt to set AI behavior" },
        history: {
          type: "array",
          description: 'Optional conversation history [{role:"user"|"assistant", content:"..."}]',
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant", "system"] },
              content: { type: "string" },
            },
            required: ["role", "content"],
          },
        },
        temperature: { type: "number", description: "Creativity level 0.0-2.0 (default: 0.7)" },
        max_tokens: { type: "integer", description: "Max response length (default: 2048, max: 4096)" },
      },
      required: ["message"],
    },
  },
  {
    name: "ai_reason",
    description:
      "Deep reasoning with chain-of-thought analysis (DeepSeek R1 distill). Best for complex logic, math, coding puzzles, and multi-step problems. Returns both thinking process and final answer. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question or problem requiring deep reasoning" },
        context: { type: "string", description: "Optional context or background information" },
      },
      required: ["question"],
    },
  },
  {
    name: "ai_embed",
    description:
      "Generate text embeddings (768-dimensional vectors, BGE base). Useful for semantic search, similarity comparison, clustering, and RAG pipelines. Batch up to 20 texts. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          description: "Single text string or array of texts to embed (max 20)",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" }, maxItems: 20 },
          ],
        },
      },
      required: ["text"],
    },
  },
  {
    name: "ai_image",
    description:
      "Generate images from text descriptions (FLUX.1 schnell by Black Forest Labs). Creates high-quality images in seconds. FREE — no API key required.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed description of the image to generate" },
        steps: { type: "integer", description: "Generation steps 1-8 (default: 4, more = higher quality)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "ai_summarize",
    description:
      "Summarize long text into concise key points (BART Large CNN). Works great for articles, documents, meeting notes, and research papers. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to summarize (up to 10,000 characters)" },
        max_length: { type: "integer", description: "Maximum summary length in tokens (default: 256)" },
      },
      required: ["text"],
    },
  },
  {
    name: "ai_translate",
    description:
      "Translate text between 100+ languages (M2M-100 1.2B). Supports direct translation between any language pair without going through English. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to translate" },
        source_lang: { type: "string", description: 'Source language code (e.g., "en", "zh", "ja", "ko", "fr")' },
        target_lang: { type: "string", description: 'Target language code (e.g., "en", "zh", "ja", "ko", "fr")' },
      },
      required: ["text", "source_lang", "target_lang"],
    },
  },
  {
    name: "ai_code",
    description:
      "AI-powered code generation, review, debugging, and refactoring (Llama 4 Scout 17B with code-optimized prompting). Supports all major programming languages. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          enum: ["generate", "review", "debug", "refactor", "explain", "test"],
          description: "What to do: generate new code, review existing code, debug errors, refactor, explain, or generate tests",
        },
        code: { type: "string", description: "Existing code (for review/debug/refactor/explain/test)" },
        instruction: { type: "string", description: "What you want (for generate) or specific instructions" },
        language: { type: "string", description: "Programming language (default: auto-detect)" },
      },
      required: ["task"],
    },
  },
  {
    name: "ai_extract",
    description:
      "Extract structured information from text: entities (people, places, orgs), sentiment, topics, key facts, and custom fields. Powered by Llama 4 Scout 17B. FREE.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to analyze" },
        extract: {
          type: "array",
          description: 'What to extract: ["entities", "sentiment", "topics", "key_facts", "summary"] or custom fields',
          items: { type: "string" },
        },
      },
      required: ["text"],
    },
  },
];

/** Tool handler functions mapped by name */
const HANDLERS: Record<string, (args: Record<string, unknown>, env: Env) => Promise<ToolResult>> = {
  ai_chat: (args, env) => handleAiChat(chatSchema.parse(args), env),
  ai_reason: (args, env) => handleAiReason(reasonSchema.parse(args), env),
  ai_embed: (args, env) => handleAiEmbed(embedSchema.parse(args), env),
  ai_image: (args, env) => handleAiImage(imageSchema.parse(args), env),
  ai_summarize: (args, env) => handleAiSummarize(summarizeSchema.parse(args), env),
  ai_translate: (args, env) => handleAiTranslate(translateSchema.parse(args), env),
  ai_code: (args, env) => handleAiCode(codeSchema.parse(args), env),
  ai_extract: (args, env) => handleAiExtract(extractSchema.parse(args), env),
};

/** Validate tool exists */
export function isValidTool(name: string): boolean {
  return name in HANDLERS;
}

/** Dispatch a tool call with Zod validation */
export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  env: Env,
): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) {
    return toolError(
      `Unknown tool: ${name}. Available: ${TOOLS.map((t) => t.name).join(", ")}`,
    );
  }
  return handler(args, env);
}
