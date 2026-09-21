import { z } from "zod";
import { jsonError, requireUser } from "@/lib/auth";
import { extractDeadlinesFromPages } from "@/lib/ingest";
import { store } from "@/lib/store";

const bodySchema = z.object({
  materialId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const material = store.material(parsed.data.materialId);
    if (!material) return Response.json({ error: "unknown material" }, { status: 404 });

    const chunks = store.chunksByMaterial(material.id);
    if (!chunks.length) {
      return Response.json({ error: "no text available for this material" }, { status: 422 });
    }

    const maxPage = Math.max(...chunks.map((c) => c.page));
    const pages = Array.from({ length: maxPage }, (_, i) =>
      chunks
        .filter((c) => c.page === i + 1)
        .map((c) => c.text)
        .join("\n")
    );

    const deadlines = await extractDeadlinesFromPages(pages, material.courseId, material.id);
    store.replaceDeadlinesForMaterial(material.id, deadlines);
    return Response.json(deadlines);
  } catch (error) {
    return jsonError(error);
  }
}
