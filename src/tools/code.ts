import { z } from "zod";
import { MODELS, MAX_TOKENS_LIMIT } from "../constants.js";
import { toolResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

const TASK_VALUES = ["generate", "review", "debug", "refactor", "explain", "test"] as const;

export const codeSchema = z.object({
  task: z.enum(TASK_VALUES),
  code: z.string().optional(),
  instruction: z.string().optional(),
  language: z.string().optional(),
});

export type CodeArgs = z.infer<typeof codeSchema>;

const SYSTEM_PROMPTS: Record<string, string> = {
  generate:
    "You are an expert software engineer. Generate clean, well-documented, production-ready code. Include comments and follow best practices.",
  review:
    "You are a senior code reviewer. Analyze the code for bugs, security issues, performance problems, and style. Provide specific, actionable feedback with line references.",
  debug:
    "You are a debugging expert. Analyze the code/error, identify the root cause, explain why it happens, and provide the corrected code.",
  refactor:
    "You are a refactoring specialist. Improve the code's structure, readability, and performance while maintaining the same behavior. Explain each change.",
  explain:
    "You are a patient coding teacher. Explain the code clearly, covering what it does, how it works, and why certain patterns are used. Use simple language.",
  test:
    "You are a QA engineer. Generate comprehensive unit tests for the given code. Cover edge cases, error scenarios, and happy paths.",
};

export async function handleAiCode(args: CodeArgs, env: Env): Promise<ToolResult> {
  const systemPrompt = SYSTEM_PROMPTS[args.task] ?? SYSTEM_PROMPTS["generate"];

  let userMsg: string;
  if (args.task === "generate") {
    userMsg = `Generate ${args.language ?? ""} code: ${args.instruction ?? ""}`.trim();
  } else {
    userMsg = `${args.task.toUpperCase()} this ${args.language ?? ""} code:\n\`\`\`\n${args.code ?? "No code provided"}\n\`\`\``;
    if (args.instruction) {
      userMsg += `\n\nAdditional instructions: ${args.instruction}`;
    }
  }

  const result = await env.AI.run(MODELS.chat, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg },
    ],
    temperature: args.task === "generate" ? 0.5 : 0.3,
    max_tokens: MAX_TOKENS_LIMIT,
  });

  return toolResult({
    model: "llama-4-scout-17b-16e",
    task: args.task,
    language: args.language ?? "auto-detected",
    result: result.response,
  });
}
