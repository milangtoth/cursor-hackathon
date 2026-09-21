import { embedTexts } from "./gemini";
import { store } from "./store";
import type { Chunk } from "./types";

export const SIMILARITY_FLOOR = 0.08;
export const TOP_K = 6;

const STOP = new Set([
  "the",
  "and",
  "for",
  "your",
  "you",
  "about",
  "what",
  "when",
  "where",
  "which",
  "this",
  "that",
  "with",
  "from",
  "into",
  "summarize",
  "summary",
  "overview",
  "explain",
  "describe",
  "course",
  "syllabus",
]);

function inferCourseId(query: string): string | undefined {
  const q = query.toLowerCase();
  if (/\bcs101\b|algorithms|data structures|sorting|graphs|visualiser/.test(q)) return "cs101";
  if (/\bdb201\b|database|sql|normali[sz]ation|er model/.test(q)) return "db201";
  return undefined;
}

export type RetrievedChunk = Chunk & { score: number };

function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function lexical(query: string, text: string) {
  const terms = [
    ...new Set(
      (query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((t) => !STOP.has(t))
    ),
  ];
  if (!terms.length) return 0;
  const hay = text.toLowerCase();
  let hit = 0;
  for (const t of terms) if (hay.includes(t)) hit += 1;
  return hit / terms.length;
}

export async function retrieve(query: string, courseId?: string): Promise<RetrievedChunk[]> {
  const scoped = courseId ?? inferCourseId(query);
  const pool = (scoped ? store.chunksByCourse(scoped) : store.chunks()).filter(
    (c) => c.embedding.length > 0
  );
  if (!pool.length) return [];

  const [qvec] = await embedTexts([query], "RETRIEVAL_QUERY");

  const scored: RetrievedChunk[] = [];
  for (const chunk of pool) {
    const score = 0.55 * dot(qvec, chunk.embedding) + 0.45 * lexical(query, chunk.text);
    if (score >= SIMILARITY_FLOOR) scored.push({ ...chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_K);
}
