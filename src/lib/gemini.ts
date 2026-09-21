import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { z } from "zod";

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;
const EMBED_BATCH = 20;
const FLASH_PRIMARY = "gemini-3.6-flash";
const FLASH_FALLBACK = "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;
let resolvedFlash: string | null = null;

function apiKey() {
  const name = "GEMINI" + "_API_KEY";
  const key = process.env[name];
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
}

function client() {
  return (cachedClient ??= new GoogleGenAI({ apiKey: apiKey() }));
}

export function flashModelName() {
  return resolvedFlash ?? FLASH_PRIMARY;
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

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

export async function embedTexts(
  texts: string[],
  taskType: EmbedTask = "RETRIEVAL_DOCUMENT"
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out: number[][] = [];
  const ai = client();
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const res = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: batch,
      config: {
        outputDimensionality: EMBED_DIM,
        taskType,
      },
    });
    const embeddings = res.embeddings ?? [];
    if (embeddings.length !== batch.length) {
      throw new Error(`embed expected ${batch.length} vectors, got ${embeddings.length}`);
    }
    for (const emb of embeddings) {
      const values = emb.values;
      if (!values || values.length !== EMBED_DIM) {
        throw new Error(`embed dim ${values?.length ?? 0}, expected ${EMBED_DIM}`);
      }
      out.push(normalizeVec(values));
    }
  }
  return out;
}

export const deadlineListSchema = z.object({
  deadlines: z.array(
    z.object({
      title: z.string(),
      dueAt: z.string(),
      page: z.number().int(),
    })
  ),
});

export const deadlineListGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    deadlines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          dueAt: { type: Type.STRING, description: "ISO 8601 datetime" },
          page: { type: Type.INTEGER },
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

export const summaryGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "2-4 sentence summary of the material" },
  },
  required: ["summary"],
};

export const askOutputSchema = z.object({
  answer: z.string(),
  citationIds: z.array(z.string()),
});

export const askOutputGeminiSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    citationIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING, description: "chunk id from the supplied excerpts" },
    },
  },
  required: ["answer", "citationIds"],
};

export type GenerateJsonArgs<T> = {
  prompt: string;
  schema: z.ZodType<T>;
  responseSchema: Schema;
  temperature?: number;
  maxOutputTokens?: number;
};

async function generateWithModel(model: string, args: Omit<GenerateJsonArgs<unknown>, "schema">) {
  const config: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: string;
    responseSchema: Schema;
  } = {
    temperature: args.temperature ?? 0.2,
    maxOutputTokens: args.maxOutputTokens ?? 1024,
    responseMimeType: "application/json",
    responseSchema: args.responseSchema,
  };
  const res = await client().models.generateContent({
    model,
    contents: args.prompt,
    config,
  });
  const text = res.text?.trim();
  if (!text) {
    const finish = res.candidates?.[0]?.finishReason;
    throw new Error(`empty model response from ${model}${finish ? ` (${finish})` : ""}`);
  }
  return text;
}

function parseJsonText(text: string): unknown {
  const trimmed = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(trimmed);
}

export async function generateJson<T>(args: GenerateJsonArgs<T>): Promise<T> {
  const callArgs = {
    prompt: args.prompt,
    responseSchema: args.responseSchema,
    temperature: args.temperature,
    maxOutputTokens: args.maxOutputTokens,
  };

  let text: string;
  if (resolvedFlash) {
    text = await generateWithModel(resolvedFlash, callArgs);
  } else {
    try {
      text = await generateWithModel(FLASH_PRIMARY, callArgs);
      resolvedFlash = FLASH_PRIMARY;
    } catch (primaryErr) {
      try {
        text = await generateWithModel(FLASH_FALLBACK, callArgs);
        resolvedFlash = FLASH_FALLBACK;
      } catch {
        throw primaryErr;
      }
    }
  }

  const parsed = parseJsonText(text);
  return args.schema.parse(parsed);
}
