import { extractText } from "unpdf";
import {
  deadlineListGeminiSchema,
  deadlineListSchema,
  embedTexts,
  generateJson,
  summaryGeminiSchema,
  summarySchema,
} from "./gemini";
import { newId } from "./store";
import type { Chunk, Deadline, IngestMeta, IngestResult, Material } from "./types";

const CHUNK_CHARS = 900;

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

function toPdfBytes(buffer: Buffer | Uint8Array): Uint8Array {
  // Node Buffer subclasses Uint8Array; unpdf wants a plain Uint8Array.
  return new Uint8Array(buffer);
}

function chunkPage(pageText: string, page: number): { page: number; text: string }[] {
  const cleaned = pageText.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= CHUNK_CHARS) return [{ page, text: cleaned }];

  const pieces: { page: number; text: string }[] = [];
  let i = 0;
  while (i < cleaned.length) {
    let end = Math.min(i + CHUNK_CHARS, cleaned.length);
    if (end < cleaned.length) {
      const breakAt = cleaned.lastIndexOf(" ", end);
      if (breakAt > i + CHUNK_CHARS * 0.5) end = breakAt;
    }
    const text = cleaned.slice(i, end).trim();
    if (text) pieces.push({ page, text });
    i = end;
  }
  return pieces;
}

function numberedPages(pages: string[]) {
  return pages
    .map((t, i) => `[Page ${i + 1}]\n${t.trim()}`)
    .filter((t) => t.replace(/\[Page \d+\]/, "").trim().length > 0)
    .join("\n\n");
}

export async function extractDeadlinesFromPages(
  pages: string[],
  courseId: string,
  materialId: string
): Promise<Deadline[]> {
  const body = numberedPages(pages);
  if (!body.trim()) return [];
  const result = await generateJson({
    prompt: `Extract assignment, exam, and project deadlines from this course document.
Use ISO 8601 datetimes. If a time is missing, use 23:59:00.000Z on that date.
If a year is missing, assume 2026. page is the 1-based page number from the markers.
Return an empty list if none are found.

${body}`,
    schema: deadlineListSchema,
    responseSchema: deadlineListGeminiSchema,
    temperature: 0.1,
    maxOutputTokens: 1024,
  });

  const out: Deadline[] = [];
  for (const d of result.deadlines) {
    const ms = Date.parse(d.dueAt);
    if (!Number.isFinite(ms) || !d.title.trim()) continue;
    const page = Math.max(1, d.page || 1);
    out.push({
      id: newId(),
      courseId,
      title: d.title.trim(),
      dueAt: new Date(ms).toISOString(),
      source: { materialId, page },
    });
  }
  return out;
}

async function extractSummary(pages: string[], title: string): Promise<string | null> {
  const body = numberedPages(pages);
  if (!body.trim()) return null;
  const result = await generateJson({
    prompt: `Summarize this course material titled "${title}" in 2-4 sentences. Mention any deadlines if present.\n\n${body}`,
    schema: summarySchema,
    responseSchema: summaryGeminiSchema,
    temperature: 0.2,
    maxOutputTokens: 512,
  });
  const summary = result.summary.trim();
  return summary || null;
}

export async function ingestPdf(buffer: Buffer | Uint8Array, meta: IngestMeta): Promise<IngestResult> {
  const { totalPages, text: pages } = await extractText(toPdfBytes(buffer), { mergePages: false });
  const pageTexts = Array.isArray(pages) ? pages : [pages];
  const hasText = pageTexts.some((p) => p.replace(/\s+/g, " ").trim().length > 0);
  if (!totalPages || !hasText) {
    throw new IngestError("no text layer found, OCR is on the roadmap");
  }

  const materialId = meta.materialId ?? newId();
  const material: Material = {
    id: materialId,
    courseId: meta.courseId,
    moduleId: meta.moduleId,
    kind: meta.kind,
    title: meta.title,
    fileName: meta.fileName,
    pageCount: totalPages,
    uploadedAt: new Date().toISOString(),
    published: meta.published ?? true,
  };

  const pieces = pageTexts.flatMap((pageText, i) => chunkPage(pageText, i + 1));
  const embeddings = await embedTexts(pieces.map((p) => p.text), "RETRIEVAL_DOCUMENT");

  const chunks: Chunk[] = pieces.map((p, i) => ({
    id: `${materialId}-p${p.page}-c${i}`,
    courseId: meta.courseId,
    materialId,
    page: p.page,
    text: p.text,
    embedding: embeddings[i] ?? [],
  }));

  let deadlines: Deadline[] = [];
  let summary: string | null = null;

  if (meta.extractDeadlines !== false) {
    try {
      deadlines = await extractDeadlinesFromPages(pageTexts, meta.courseId, materialId);
    } catch (err) {
      console.warn(`ingest: deadlines failed for ${meta.title}:`, err instanceof Error ? err.message : err);
      deadlines = [];
    }
  }

  if (meta.extractSummary !== false) {
    try {
      summary = await extractSummary(pageTexts, meta.title);
    } catch (err) {
      console.warn(`ingest: summary failed for ${meta.title}:`, err instanceof Error ? err.message : err);
      summary = null;
    }
  }

  return { material, chunks, deadlines, summary };
}
