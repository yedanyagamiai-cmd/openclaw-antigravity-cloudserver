import { z } from "zod";
import { MODELS, MAX_TOKENS_LIMIT } from "../constants.js";
import { toolResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const reasonSchema = z.object({
  question: z.string().min(1, "Question is required"),
  context: z.string().optional(),
});

export type ReasonArgs = z.infer<typeof reasonSchema>;

const REASON_SYSTEM_PROMPT =
  "You are a deep reasoning AI. Think step by step. Show your reasoning process clearly before giving the final answer. Use <think>...</think> tags for your reasoning process.";

export async function handleAiReason(args: ReasonArgs, env: Env): Promise<ToolResult> {
  const userContent = args.context
    ? `Context: ${args.context}\n\nQuestion: ${args.question}`
    : args.question;

  const messages = [
    { role: "system", content: REASON_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];

  const result = await env.AI.run(MODELS.reason, {
    messages,
    max_tokens: MAX_TOKENS_LIMIT,
    temperature: 0.3,
  });

  const response = result.response ?? "";
  let thinking = "";
  let answer = response;

  const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch?.[1]) {
    thinking = thinkMatch[1].trim();
    answer = response.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  }

  return toolResult({
    model: "deepseek-r1-distill-qwen-32b",
    thinking: thinking || "(reasoning embedded in response)",
    answer,
    full_response: response,
  });
}
