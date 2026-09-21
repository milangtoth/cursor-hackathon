import OpenAI from "openai";
import { z } from "zod";

const EMBED_DIM = 768;
const GENERATE_MODELS = ["deepseek-flash", "deepseek-chat", "deepseek-v4-pro"] as const;

let cachedClient: OpenAI | null = null;
let resolvedFlash: string | null = null;

function apiKey() {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY is not set");
  return key;
}

function client() {
  return (cachedClient ??= new OpenAI({
    apiKey: apiKey(),
    baseURL: "https://api.deepseek.com",
  }));
}

export function flashModelName() {
  return resolvedFlash ?? GENERATE_MODELS[0];
}

export function embedDim() {
  return EMBED_DIM;
}

export function normalizeVec(values: number[]): number[] {
  let mag = 0;
  for (const v of values) mag += v * v;
  mag = Math.sqrt(mag);
  if (!mag) return values;
  return values.map((v) => v / mag);
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isNotFound(err: unknown): boolean {
  const msg = errMessage(err);
  return msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("Model Not Exist");
}

function isRetryable(err: unknown): boolean {
  const msg = errMessage(err);
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded")
  );
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function addFeature(vec: Float64Array, feat: string, weight: number) {
  const h = hash32(feat);
  const sign = h & 1 ? 1 : -1;
  vec[h % EMBED_DIM] += sign * weight;
}

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

function embedOne(text: string, _taskType: EmbedTask): number[] {
  const vec = new Float64Array(EMBED_DIM);
  const tokens = text.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  for (const tok of tokens) {
    addFeature(vec, tok, 1);
    if (tok.length >= 3) {
      for (let i = 0; i <= tok.length - 3; i++) addFeature(vec, tok.slice(i, i + 3), 0.3);
    }
  }
  return normalizeVec(Array.from(vec));
}

export async function embedTexts(
  texts: string[],
  taskType: EmbedTask = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  return texts.map((t) => embedOne(t, taskType));
}

export type ResponseSchema = Record<string, unknown>;

export const deadlineListSchema = z.object({
  deadlines: z.array(
    z.object({
      title: z.string(),
      dueAt: z.string(),
      page: z.number().int(),
    })
  ),
});

export const deadlineListGeminiSchema: ResponseSchema = {
  type: "object",
  properties: {
    deadlines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          dueAt: { type: "string", description: "ISO 8601 datetime" },
          page: { type: "integer" },
        },
        required: ["title", "dueAt", "page"],
      },
    },
  },
  required: ["deadlines"],
};

export const summarySchema = z.object({
  summary: z.string(),
});

export const summaryGeminiSchema: ResponseSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "2-4 sentence summary of the material" },
  },
  required: ["summary"],
};

export const askOutputSchema = z.object({
  answer: z.string(),
  citationIds: z.array(z.string()),
  followUps: z.array(z.string()).max(3).default([]),
});

export const askOutputGeminiSchema: ResponseSchema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citationIds: {
      type: "array",
      items: { type: "string", description: "chunk id from the supplied excerpts" },
    },
    followUps: {
      type: "array",
      items: { type: "string", description: "short next question the student could ask" },
    },
  },
  required: ["answer", "citationIds", "followUps"],
};

export type GenerateJsonArgs<T> = {
  prompt: string;
  schema: z.ZodType<T>;
  responseSchema: ResponseSchema;
  temperature?: number;
  maxOutputTokens?: number;
};

function parseJsonText(text: string): unknown {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(trimmed);
}

function generateModelOrder(): string[] {
  if (!resolvedFlash) return [...GENERATE_MODELS];
  return [resolvedFlash, ...GENERATE_MODELS.filter((m) => m !== resolvedFlash)];
}

async function generateWithModel(model: string, args: Omit<GenerateJsonArgs<unknown>, "schema">) {
  const res = await client().chat.completions.create({
    model,
    temperature: args.temperature ?? 0.2,
    max_tokens: args.maxOutputTokens ?? 1024,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You output json only. No markdown. Match this json shape:\n${JSON.stringify(args.responseSchema)}`,
      },
      { role: "user", content: args.prompt },
    ],
    thinking: { type: "disabled" },
  } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming);
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error(`empty model response from ${model} (${res.choices[0]?.finish_reason ?? "no content"})`);
  }
  return text;
}

async function generateWithFallback(args: Omit<GenerateJsonArgs<unknown>, "schema">) {
  let lastErr: unknown;
  for (const model of generateModelOrder()) {
    try {
      const text = await generateWithModel(model, args);
      resolvedFlash = model;
      return text;
    } catch (err) {
      lastErr = err;
      if (resolvedFlash === model) resolvedFlash = null;
      if (isNotFound(err)) continue;
      throw err;
    }
  }
  throw lastErr;
}

export async function generateJson<T>(args: GenerateJsonArgs<T>): Promise<T> {
  const callArgs = {
    prompt: args.prompt,
    responseSchema: args.responseSchema,
    temperature: args.temperature,
    maxOutputTokens: args.maxOutputTokens,
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await generateWithFallback(callArgs);
      return args.schema.parse(parseJsonText(text));
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === 2) throw err;
      resolvedFlash = null;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw lastErr;
}
