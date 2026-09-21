import { z } from "zod";
import { askOutputGeminiSchema, askOutputSchema, generateJson } from "@/lib/gemini";
import { getCurrentUser, HttpError, jsonError } from "@/lib/auth";
import { retrieve } from "@/lib/retrieve";
import { store } from "@/lib/store";
import type { Citation, Deadline } from "@/lib/types";

const bodySchema = z.object({
  question: z.string().min(1),
  courseId: z.string().optional(),
  history: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })
    )
    .max(6)
    .optional(),
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

function toCitations(
  chunks: { id: string; courseId: string; materialId: string; page: number; text: string }[]
): Citation[] {
  return chunks.map((chunk) => {
    const material = store.material(chunk.materialId);
    return {
      chunkId: chunk.id,
      materialId: chunk.materialId,
      materialTitle: material?.title ?? chunk.materialId,
      page: chunk.page,
      snippet: snippet(chunk.text),
      courseId: chunk.courseId,
    };
  });
}

function ndjsonStream(write: (send: (event: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        await write(send);
      } catch (error) {
        const message = error instanceof Error ? error.message : "ask failed";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthenticated");

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { question, courseId, history = [] } = parsed.data;
    const prior = history.slice(-4);
    const retrieveQuery = prior.length
      ? `${prior.map((t) => t.question).join(" ")} ${question}`
      : question;

    return ndjsonStream(async (send) => {
      const hits = await retrieve(retrieveQuery, courseId);
      const retrieved = toCitations(hits);
      // Flush sources before generation so the dialog can paint them immediately.
      send({ type: "citations", citations: retrieved });

      const deadlines = courseId
        ? store.deadlinesByCourse(courseId)
        : store.deadlines().filter((d) => user.role === "admin" || user.courseIds.includes(d.courseId));

      if (!hits.length && !deadlines.length) {
        store.logQuestion({
          userId: user.id,
          courseId,
          question,
          citationCount: 0,
        });
        send({ type: "answer", answer: NOT_FOUND, citations: [] });
        return;
      }

      const allowed = new Set(hits.map((h) => h.id));
      const excerpts = hits
        .map(
          (h, i) =>
            `[${i + 1}] id=${h.id} page=${h.page} material=${h.materialId}\n${h.text}`
        )
        .join("\n\n");

      const thread =
        prior.length === 0
          ? ""
          : `Earlier in this thread (for pronouns like "that" / "it" only; still cite only the excerpts below):\n${prior
              .map((t) => `Student: ${t.question}\nYou: ${t.answer}`)
              .join("\n")}\n\n`;

      const generated = await generateJson({
        prompt: `You answer a student using ONLY the numbered excerpts and the deadline list.
Cite only supplied chunk ids in citationIds. Do not invent ids.
Keep the answer to 4 sentences or fewer.
If the excerpts and deadlines do not contain the answer, say you could not find it in the materials.
${thread}Deadline list:
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
      const citedHits = citationIds
        .map((id) => hits.find((h) => h.id === id))
        .filter((h): h is (typeof hits)[number] => h != null);
      const citations = citedHits.length ? toCitations(citedHits) : retrieved;

      store.logQuestion({
        userId: user.id,
        courseId,
        question,
        citationCount: citations.length,
      });

      send({ type: "answer", answer: generated.answer, citations });
    });
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    const message = error instanceof Error ? error.message : "ask failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
