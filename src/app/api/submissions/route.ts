import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jsonError, requireRole } from "@/lib/auth";
import { newId, store } from "@/lib/store";
import type { Submission } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await requireRole("student");
    const form = await req.formData();
    const file = form.get("file");
    const materialId = String(form.get("materialId") ?? "");

    if (!(file instanceof File) || !materialId) {
      return Response.json(
        { error: "file and materialId are required" },
        { status: 400 },
      );
    }

    const material = store.material(materialId);
    if (!material || material.kind !== "assignment" || !material.published) {
      return Response.json({ error: "unknown assignment" }, { status: 404 });
    }
    if (!user.courseIds.includes(material.courseId)) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "file is too large (10 MB max)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "submission.pdf";
    const fileName = `${user.id}-${material.id}-${Date.now()}-${safe}`;
    const uploadDir = join(process.cwd(), "uploads", "submissions");
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, fileName), buf);

    const submission: Submission = {
      id: store.submissionFor(user.id, material.id)?.id ?? newId(),
      userId: user.id,
      courseId: material.courseId,
      materialId: material.id,
      fileName,
      originalName: file.name,
      submittedAt: new Date().toISOString(),
    };
    store.upsertSubmission(submission);
    return Response.json(submission);
  } catch (error) {
    return jsonError(error);
  }
}
