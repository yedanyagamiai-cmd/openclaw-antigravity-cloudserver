import { z } from "zod";
import { MODELS, DEFAULT_TEMPERATURE, DEFAULT_MAX_TOKENS, MAX_TOKENS_LIMIT } from "../constants.js";
import { toolResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  system: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      }),
    )
    .optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(MAX_TOKENS_LIMIT).optional(),
});

export type ChatArgs = z.infer<typeof chatSchema>;

export async function handleAiChat(args: ChatArgs, env: Env): Promise<ToolResult> {
  const messages: Array<{ role: string; content: string }> = [];

  if (args.system) {
    messages.push({ role: "system", content: args.system });
  }
  if (args.history) {
    messages.push(...args.history);
  }
  messages.push({ role: "user", content: args.message });

  const result = await env.AI.run(MODELS.chat, {
    messages,
    temperature: args.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: args.max_tokens ?? DEFAULT_MAX_TOKENS,
  });

  return toolResult({
    model: "llama-4-scout-17b-16e",
    response: result.response,
    usage: result.usage ?? null,
  });
}
