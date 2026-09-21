import { z } from "zod";
import { generateJson, summaryGeminiSchema, summarySchema } from "@/lib/gemini";
import { getCurrentUser, HttpError, jsonError } from "@/lib/auth";
import { store } from "@/lib/store";

const bodySchema = z.object({
  materialId: z.string().min(1),
  force: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "unauthenticated");

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { materialId, force } = parsed.data;
    const material = store.material(materialId);
    if (!material) {
      return Response.json({ error: "unknown material" }, { status: 404 });
    }

    const cached = store.summary(materialId);
    if (cached && !force) {
      return Response.json({ summary: cached, cached: true });
    }

    const chunks = store.chunksByMaterial(materialId);
    const body = chunks.length
      ? chunks.map((c) => `[Page ${c.page}] ${c.text}`).join("\n\n")
      : "";
    if (!body.trim()) {
      return Response.json({ error: "no text available for this material" }, { status: 422 });
    }

    const result = await generateJson({
      prompt: `Summarize this course material titled "${material.title}" in 2-4 sentences. Mention any deadlines if present.\n\n${body}`,
      schema: summarySchema,
      responseSchema: summaryGeminiSchema,
      temperature: 0.2,
      maxOutputTokens: 512,
    });

    const summary = result.summary.trim();
    store.setSummary(materialId, summary);
    return Response.json({ summary, cached: false });
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error);
    const message = error instanceof Error ? error.message : "summarize failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
