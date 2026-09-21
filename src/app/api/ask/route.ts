import { z } from "zod";
import { askOutputGeminiSchema, askOutputSchema, generateJson } from "@/lib/gemini";
import { getCurrentUser, HttpError, jsonError } from "@/lib/auth";
import { retrieve } from "@/lib/retrieve";
import { store } from "@/lib/store";
import type { AskResponse, Citation, Deadline } from "@/lib/types";

const bodySchema = z.object({
  question: z.string().min(1),
  courseId: z.string().optional(),
});

const NOT_FOUND = "not found in your materials";

function formatDeadlines(deadlines: Deadline[]) {
  if (!deadlines.length) return "(none listed)";
  return deadlines
    .map((d) => {
      const src = "manual" in d.source ? "manual" : `${d.source.materialId} p.${d.source.page}`;
      return `- ${d.title} — ${d.dueAt} (${src})`;
    })
    .join("\n");
}

function snippet(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthenticated");

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { question, courseId } = parsed.data;
    const hasIndex = (courseId ? store.chunksByCourse(courseId) : store.chunks()).some(
      (c) => c.embedding.length > 0
    );
    const hits = hasIndex ? await retrieve(question, courseId) : [];

    if (!hits.length) {
      store.logQuestion({
        userId: user.id,
        courseId,
        question,
        citationCount: 0,
      });
      const empty: AskResponse = { answer: NOT_FOUND, citations: [] };
      return Response.json(empty);
    }

    const deadlines = courseId
      ? store.deadlinesByCourse(courseId)
      : store.deadlines().filter((d) => user.role === "admin" || user.courseIds.includes(d.courseId));

    const allowed = new Set(hits.map((h) => h.id));
    const excerpts = hits
      .map(
        (h, i) =>
          `[${i + 1}] id=${h.id} page=${h.page} material=${h.materialId}\n${h.text}`
      )
      .join("\n\n");

    const generated = await generateJson({
      prompt: `You answer a student using ONLY the numbered excerpts and the deadline list.
Cite only supplied chunk ids in citationIds. Do not invent ids.
Keep the answer to 4 sentences or fewer.
If the excerpts and deadlines do not contain the answer, say you could not find it in the materials.

Deadline list:
${formatDeadlines(deadlines)}

Excerpts:
${excerpts}

Question: ${question}`,
      schema: askOutputSchema,
      responseSchema: askOutputGeminiSchema,
      temperature: 0.15,
      maxOutputTokens: 512,
    });

    const citationIds = generated.citationIds.filter((id) => allowed.has(id));
    const citations: Citation[] = [];
    for (const id of citationIds) {
      const chunk = hits.find((h) => h.id === id);
      if (!chunk) continue;
      const material = store.material(chunk.materialId);
      citations.push({
        chunkId: chunk.id,
        materialId: chunk.materialId,
        materialTitle: material?.title ?? chunk.materialId,
        page: chunk.page,
        snippet: snippet(chunk.text),
      });
    }

    store.logQuestion({
      userId: user.id,
      courseId,
      question,
      citationCount: citations.length,
    });

    const body: AskResponse = { answer: generated.answer, citations };
    return Response.json(body);
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    const message = error instanceof Error ? error.message : "ask failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
