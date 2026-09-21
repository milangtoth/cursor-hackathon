import { embedTexts } from "./gemini";
import { store } from "./store";
import type { Chunk } from "./types";

export const SIMILARITY_FLOOR = 0.08;
export const TOP_K = 6;
export const OVERVIEW_TOP_K = 16;

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

export function inferCourseId(query: string): string | undefined {
  const q = query.toLowerCase();
  if (/\bpr12\b|calculus|derivative|integral|\bpi4\b/.test(q)) return "pr12";
  if (/\bcs101\b|algorithms|data structures|sorting|graphs|visualiser/.test(q)) return "cs101";
  if (/\bdb201\b|database|sql|normali[sz]ation|er model/.test(q)) return "db201";
  return undefined;
}

export function isOverviewQuery(query: string): boolean {
  return /\bsummar(?:y|ize|ise)\b|\boverview\b|\bkey points\b|\bweek by week\b|\bsyllabus\b/i.test(
    query
  );
}

export type RetrievedChunk = Chunk & { score: number };

export type RetrieveOptions = {
  overview?: boolean;
};

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

function lectureWeek(materialId: string) {
  const match = materialId.match(/-lec(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function firstPageChunk(materialId: string): Chunk | undefined {
  const chunks = store.chunksByMaterial(materialId).filter((c) => c.embedding.length > 0);
  if (!chunks.length) return undefined;
  return chunks.find((c) => c.page === 1) ?? chunks[0];
}

function pinOverviewAnchors(courseId: string): RetrievedChunk[] {
  const materials = store.materialsByCourse(courseId);
  const lectures = materials
    .filter((m) => /-lec\d+$/.test(m.id) || /lecture/i.test(m.title))
    .sort((a, b) => lectureWeek(a.id) - lectureWeek(b.id));
  const overviews = materials.filter((m) => /overview|syllabus/i.test(m.title));

  const pinned: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const material of [...overviews, ...lectures]) {
    const chunk = firstPageChunk(material.id);
    if (!chunk || seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    pinned.push({ ...chunk, score: 1 });
  }
  return pinned;
}

function diversifyByMaterial(scored: RetrievedChunk[], k: number): RetrievedChunk[] {
  const firsts: RetrievedChunk[] = [];
  const rest: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const chunk of scored) {
    if (!seen.has(chunk.materialId)) {
      seen.add(chunk.materialId);
      firsts.push(chunk);
    } else {
      rest.push(chunk);
    }
  }
  return [...firsts, ...rest].slice(0, k);
}

export async function retrieve(
  query: string,
  courseId?: string,
  options?: RetrieveOptions
): Promise<RetrievedChunk[]> {
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

  if (!options?.overview) return scored.slice(0, TOP_K);

  const k = OVERVIEW_TOP_K;
  const pinned = scoped ? pinOverviewAnchors(scoped) : [];
  const fill = diversifyByMaterial(scored, k);
  const merged: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const chunk of [...pinned, ...fill]) {
    if (seen.has(chunk.id)) continue;
    seen.add(chunk.id);
    merged.push(chunk);
    if (merged.length >= k) break;
  }
  return merged;
}
