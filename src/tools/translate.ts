import { z } from "zod";
import { MODELS } from "../constants.js";
import { toolResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const translateSchema = z.object({
  text: z.string().min(1, "Text is required"),
  source_lang: z.string().min(2, "Source language code is required"),
  target_lang: z.string().min(2, "Target language code is required"),
});

export type TranslateArgs = z.infer<typeof translateSchema>;

export async function handleAiTranslate(args: TranslateArgs, env: Env): Promise<ToolResult> {
  const result = (await env.AI.run(MODELS.translate, {
    text: args.text,
    source_lang: args.source_lang,
    target_lang: args.target_lang,
  })) as unknown as { translated_text: string };

  return toolResult({
    model: "m2m100-1.2b",
    source_lang: args.source_lang,
    target_lang: args.target_lang,
    original: args.text,
    translated: result.translated_text,
  });
}
