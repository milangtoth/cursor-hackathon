import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonError, requireRole } from "@/lib/auth";
import { ingestPdf, IngestError } from "@/lib/ingest";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireRole("teacher", "admin");

    const form = await req.formData();
    const file = form.get("file");
    const courseId = String(form.get("courseId") ?? "");
    const moduleId = String(form.get("moduleId") ?? "");
    const title = String(form.get("title") ?? "").trim();

    if (!(file instanceof File) || !courseId || !moduleId || !title) {
      return Response.json({ error: "file, courseId, moduleId, and title are required" }, { status: 400 });
    }

    const course = store.course(courseId);
    if (!course) return Response.json({ error: "unknown course" }, { status: 404 });
    if (!course.modules.some((m) => m.id === moduleId)) {
      return Response.json({ error: "unknown module" }, { status: 404 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload.pdf";
    const fileName = `${Date.now()}-${safe}`;
    const dir = join(process.cwd(), "uploads");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, fileName), buf);

    const result = await ingestPdf(buf, {
      courseId,
      moduleId,
      title,
      fileName,
      kind: "pdf",
      published: true,
    });

    store.upsertMaterial(result.material);
    store.replaceChunksForMaterial(result.material.id, result.chunks);
    if (result.deadlines.length) store.addDeadlines(result.deadlines);
    if (result.summary) store.setSummary(result.material.id, result.summary);

    return Response.json({
      material: result.material,
      chunksAdded: result.chunks.length,
      deadlinesFound: result.deadlines.length,
    });
  } catch (error) {
    if (error instanceof IngestError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    return jsonError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireRole("teacher", "admin");
    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId");
    if (!materialId) return Response.json({ error: "materialId required" }, { status: 400 });
    if (!store.material(materialId)) return Response.json({ error: "unknown material" }, { status: 404 });
    store.deleteMaterial(materialId);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
