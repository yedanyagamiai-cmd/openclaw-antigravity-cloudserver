import { z } from "zod";
import { MODELS, DEFAULT_MAX_TOKENS, MAX_EXTRACT_LENGTH } from "../constants.js";
import { toolResult } from "../helpers.js";
import type { Env, ToolResult } from "../types.js";

const DEFAULT_FIELDS = ["entities", "sentiment", "topics", "key_facts"];

export const extractSchema = z.object({
  text: z.string().min(1, "Text is required"),
  extract: z.array(z.string()).optional(),
});

export type ExtractArgs = z.infer<typeof extractSchema>;

export async function handleAiExtract(args: ExtractArgs, env: Env): Promise<ToolResult> {
  const fields = args.extract ?? DEFAULT_FIELDS;
  const text = args.text.slice(0, MAX_EXTRACT_LENGTH);

  const result = await env.AI.run(MODELS.chat, {
    messages: [
      {
        role: "system",
        content: `You are an information extraction AI. Analyze the given text and extract the requested information. Return your response as valid JSON with the following fields: ${fields.join(", ")}. For entities, categorize them (person, organization, location, date, product, etc.). For sentiment, provide a score (-1.0 to 1.0) and label (very negative, negative, neutral, positive, very positive).`,
      },
      {
        role: "user",
        content: `Extract the following from this text: [${fields.join(", ")}]\n\nText:\n${text}`,
      },
    ],
    temperature: 0.1,
    max_tokens: DEFAULT_MAX_TOKENS,
  });

  let parsed: unknown = null;
  try {
    const jsonMatch = (result.response ?? "").match(/\{[\s\S]*\}/);
    if (jsonMatch?.[0]) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // JSON parse failed — return raw response
  }

  return toolResult({
    model: "llama-4-scout-17b-16e",
    extracted: parsed ?? result.response,
    fields_requested: fields,
    text_length: args.text.length,
  });
}
