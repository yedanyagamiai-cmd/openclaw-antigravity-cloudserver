import { z } from "zod";
import { MODELS, IMAGE_MAX_STEPS, IMAGE_DEFAULT_STEPS } from "../constants.js";
import { imageResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

export const imageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  steps: z.number().int().min(1).max(IMAGE_MAX_STEPS).optional(),
});

export type ImageArgs = z.infer<typeof imageSchema>;

/** Convert Uint8Array to base64 in chunks to avoid btoa stack overflow */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function handleAiImage(args: ImageArgs, env: Env): Promise<ToolResult> {
  const steps = args.steps ?? IMAGE_DEFAULT_STEPS;

  const result = await (env.AI as { run: (model: string, input: Record<string, unknown>) => Promise<ReadableStream> }).run(
    MODELS.image,
    { prompt: args.prompt, num_steps: steps },
  );

  const imageBytes = new Uint8Array(
    await new Response(result).arrayBuffer(),
  );
  const base64 = uint8ToBase64(imageBytes);

  return imageResult(base64, {
    model: "FLUX.1-schnell",
    prompt: args.prompt,
    steps,
    size_bytes: imageBytes.length,
  });
}
