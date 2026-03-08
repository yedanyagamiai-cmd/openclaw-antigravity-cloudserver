import { z } from "zod";
import { MODELS, MAX_EMBED_BATCH } from "../constants.js";
import { toolResult, toolError } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const embedSchema = z.object({
  text: z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1).max(MAX_EMBED_BATCH),
  ]),
});

export type EmbedArgs = z.infer<typeof embedSchema>;

export async function handleAiEmbed(args: EmbedArgs, env: Env): Promise<ToolResult> {
  const texts = Array.isArray(args.text) ? args.text : [args.text];

  if (texts.length > MAX_EMBED_BATCH) {
    return toolError(`Maximum ${MAX_EMBED_BATCH} texts per request`);
  }

  const result = (await env.AI.run(MODELS.embed, { text: texts })) as unknown as {
    data: number[][];
  };

  return toolResult({
    model: "bge-base-en-v1.5",
    dimensions: 768,
    embeddings: result.data.map(
      (d: number[], i: number) => ({
        index: i,
        text_preview: texts[i]?.slice(0, 80) ?? "",
        vector_preview: d.slice(0, 5).map((v) => v.toFixed(6)),
        vector_length: d.length,
      }),
    ),
    _note: "Full vectors available. Each is a 768-dim float array.",
  });
}
