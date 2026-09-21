import { embedTexts } from "./gemini";
import { store } from "./store";
import type { Chunk } from "./types";

export const SIMILARITY_FLOOR = 0.35;
export const TOP_K = 6;

export type RetrievedChunk = Chunk & { score: number };

function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export async function retrieve(query: string, courseId?: string): Promise<RetrievedChunk[]> {
  const pool = (courseId ? store.chunksByCourse(courseId) : store.chunks()).filter(
    (c) => c.embedding.length > 0
  );
  if (!pool.length) return [];

  const [qvec] = await embedTexts([query], "RETRIEVAL_QUERY");

  const scored: RetrievedChunk[] = [];
  for (const chunk of pool) {
    const score = dot(qvec, chunk.embedding);
    if (score >= SIMILARITY_FLOOR) scored.push({ ...chunk, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_K);
}
