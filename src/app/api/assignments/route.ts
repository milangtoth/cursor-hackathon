import { z } from "zod";
import { jsonError, requireRole } from "@/lib/auth";
import { newId, store } from "@/lib/store";
import type { Deadline } from "@/lib/types";

const bodySchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  dueAt: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireRole("teacher", "admin");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const ms = Date.parse(parsed.data.dueAt);
    if (!Number.isFinite(ms)) {
      return Response.json({ error: "invalid dueAt" }, { status: 400 });
    }
    if (!store.course(parsed.data.courseId)) {
      return Response.json({ error: "unknown course" }, { status: 404 });
    }

    const deadline: Deadline = {
      id: newId(),
      courseId: parsed.data.courseId,
      title: parsed.data.title,
      dueAt: new Date(ms).toISOString(),
      source: { manual: true },
    };
    store.addDeadlines([deadline]);
    return Response.json(deadline);
  } catch (error) {
    return jsonError(error);
  }
}
