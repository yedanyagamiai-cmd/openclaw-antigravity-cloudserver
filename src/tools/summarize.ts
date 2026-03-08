import { z } from "zod";
import { MODELS, MAX_SUMMARIZE_LENGTH, MIN_SUMMARIZE_LENGTH } from "../constants.js";
import { toolResult, toolError } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const summarizeSchema = z.object({
  text: z.string().min(MIN_SUMMARIZE_LENGTH, `Text too short (min ${MIN_SUMMARIZE_LENGTH} characters)`),
  max_length: z.number().int().min(1).max(1024).optional(),
});

export type SummarizeArgs = z.infer<typeof summarizeSchema>;

export async function handleAiSummarize(args: SummarizeArgs, env: Env): Promise<ToolResult> {
  const text = args.text.slice(0, MAX_SUMMARIZE_LENGTH);

  if (text.length < MIN_SUMMARIZE_LENGTH) {
    return toolError(`Text too short to summarize (min ${MIN_SUMMARIZE_LENGTH} characters)`);
  }

  const result = await env.AI.run(MODELS.summarize, {
    input_text: text,
    max_length: Math.min(1024, args.max_length ?? 256),
  });

  const summary = result.summary ?? "";

  return toolResult({
    model: "bart-large-cnn",
    summary,
    original_length: text.length,
    summary_length: summary.length,
    compression_ratio: `${((summary.length / text.length) * 100).toFixed(1)}%`,
  });
}
