import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonError, requireRole, HttpError } from "@/lib/auth";
import { ingestPdf, IngestError, type IngestStep } from "@/lib/ingest";
import { store } from "@/lib/store";

export const runtime = "nodejs";

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
        if (error instanceof IngestError) {
          send({ type: "error", error: error.message });
        } else {
          const message = error instanceof Error ? error.message : "upload failed";
          send({ type: "error", error: message });
        }
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
    const uploadDir = join(process.cwd(), "uploads");
    const publicDir = join(process.cwd(), "public", "content");
    mkdirSync(uploadDir, { recursive: true });
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(join(uploadDir, fileName), buf);
    writeFileSync(join(publicDir, fileName), buf);

    const wantsStream = (req.headers.get("accept") ?? "").includes("ndjson");
    const runIngest = async (onProgress?: (step: IngestStep) => void) => {
      const result = await ingestPdf(
        buf,
        {
          courseId,
          moduleId,
          title,
          fileName,
          kind: "pdf",
          published: true,
        },
        onProgress
      );
      store.upsertMaterial(result.material);
      store.replaceChunksForMaterial(result.material.id, result.chunks);
      if (result.deadlines.length) store.addDeadlines(result.deadlines);
      if (result.summary) store.setSummary(result.material.id, result.summary);
      return result;
    };

    if (!wantsStream) {
      try {
        const result = await runIngest();
        return Response.json({
          material: result.material,
          chunksAdded: result.chunks.length,
          deadlinesFound: result.deadlines.length,
        });
      } catch (error) {
        if (error instanceof IngestError) {
          return Response.json({ error: error.message }, { status: 422 });
        }
        throw error;
      }
    }

    return ndjsonStream(async (send) => {
      const result = await runIngest((step) => send({ type: "step", ...step }));
      send({
        type: "done",
        material: result.material,
        chunksAdded: result.chunks.length,
        deadlinesFound: result.deadlines.length,
      });
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole("teacher", "admin");

    const form = await req.formData();
    const materialId = String(form.get("materialId") ?? "");
    const existing = store.material(materialId);
    if (!existing) return Response.json({ error: "unknown material" }, { status: 404 });
    if (user.role !== "admin" && !user.courseIds.includes(existing.courseId)) {
      throw new HttpError(403, "forbidden");
    }

    const course = store.course(existing.courseId);
    if (!course) return Response.json({ error: "unknown course" }, { status: 404 });

    const title = String(form.get("title") ?? "").trim() || existing.title;
    const moduleId = String(form.get("moduleId") ?? "") || existing.moduleId;
    if (!course.modules.some((m) => m.id === moduleId)) {
      return Response.json({ error: "unknown module" }, { status: 404 });
    }

    const publishedRaw = form.get("published");
    const published =
      publishedRaw == null ? existing.published : String(publishedRaw) === "true";
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      existing.title = title;
      existing.moduleId = moduleId;
      existing.published = published;
      store.upsertMaterial(existing);
      return Response.json({ material: existing });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "upload.pdf";
    const fileName = `${Date.now()}-${safe}`;
    const uploadDir = join(process.cwd(), "uploads");
    const publicDir = join(process.cwd(), "public", "content");
    mkdirSync(uploadDir, { recursive: true });
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(join(uploadDir, fileName), buf);
    writeFileSync(join(publicDir, fileName), buf);

    const wantsStream = (req.headers.get("accept") ?? "").includes("ndjson");
    const runIngest = async (onProgress?: (step: IngestStep) => void) => {
      const result = await ingestPdf(
        buf,
        {
          courseId: existing.courseId,
          moduleId,
          materialId: existing.id,
          title,
          fileName,
          kind: existing.kind,
          published,
        },
        onProgress
      );
      store.upsertMaterial(result.material);
      store.replaceChunksForMaterial(result.material.id, result.chunks);
      store.replaceDeadlinesForMaterial(result.material.id, result.deadlines);
      store.setSummary(result.material.id, result.summary);
      return result;
    };

    if (!wantsStream) {
      try {
        const result = await runIngest();
        return Response.json({
          material: result.material,
          chunksAdded: result.chunks.length,
          deadlinesFound: result.deadlines.length,
        });
      } catch (error) {
        if (error instanceof IngestError) {
          return Response.json({ error: error.message }, { status: 422 });
        }
        throw error;
      }
    }

    return ndjsonStream(async (send) => {
      const result = await runIngest((step) => send({ type: "step", ...step }));
      send({
        type: "done",
        material: result.material,
        chunksAdded: result.chunks.length,
        deadlinesFound: result.deadlines.length,
      });
    });
  } catch (error) {
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
