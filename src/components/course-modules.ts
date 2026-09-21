import { canViewMaterial } from "@/components/demo-session";
import { store } from "@/lib/store";
import type { Course, Material, User } from "@/lib/types";

export function visibleCourseModules(course: Course, user: User) {
  const materialById = new Map(
    store
      .materialsByCourse(course.id)
      .filter((material) => canViewMaterial(user, material))
      .map((material) => [material.id, material] as const)
  );

  return [...course.modules]
    .sort((a, b) => a.order - b.order)
    .map((mod) => ({
      module: mod,
      materials: mod.materialIds
        .map((id) => materialById.get(id))
        .filter((material): material is Material => material != null),
    }))
    .filter(
      (group) => group.materials.length > 0 || user.role !== "student"
    );
}

export function weekPath(courseId: string, moduleId: string) {
  return `/courses/${courseId}/modules/${moduleId}`;
}

export function materialPath(
  courseId: string,
  materialId: string,
  opts?: { page?: number; q?: string; chunk?: string }
) {
  const path = `/courses/${courseId}/${materialId}`;
  if (!opts) return path;
  const params = new URLSearchParams();
  if (opts.page != null && Number.isFinite(opts.page)) {
    params.set("page", String(opts.page));
  }
  if (opts.q) params.set("q", opts.q);
  if (opts.chunk) params.set("chunk", opts.chunk);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
