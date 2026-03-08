/** Server identity */
export const SERVER_NAME = "openclaw-antigravity-cloudserver";
export const SERVER_VERSION = "3.0.0";
export const VENDOR = "OpenClaw Intelligence";
export const MCP_PROTOCOL_VERSION = "2025-03-26";

/** Workers AI model IDs (all FREE tier) */
export const MODELS = {
  chat: "@cf/meta/llama-4-scout-17b-16e-instruct",
  reason: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
  embed: "@cf/baai/bge-base-en-v1.5",
  image: "@cf/black-forest-labs/FLUX-1-schnell",
  translate: "@cf/meta/m2m100-1.2b",
  summarize: "@cf/facebook/bart-large-cnn",
  classify: "@cf/huggingface/distilbert-sst-2-int8",
} as const;

/** Rate limit settings */
export const FREE_LIMIT = 50;
export const PRO_LIMIT = 2000;
export const RATE_WINDOW_SECONDS = 86400;
export const MEMORY_LIMIT_PER_MINUTE = 10;

/** Input constraints */
export const MAX_TOKENS_LIMIT = 4096;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_TEMPERATURE = 0.7;
export const MAX_EMBED_BATCH = 20;
export const MAX_SUMMARIZE_LENGTH = 10000;
export const MIN_SUMMARIZE_LENGTH = 50;
export const MAX_EXTRACT_LENGTH = 5000;
export const IMAGE_MAX_STEPS = 8;
export const IMAGE_DEFAULT_STEPS = 4;
