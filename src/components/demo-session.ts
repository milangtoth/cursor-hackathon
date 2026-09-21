import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { store } from "@/lib/store";
import type { Deadline, Material, User } from "@/lib/types";

export { getCurrentUser } from "@/lib/auth";
export { homePathFor } from "@/lib/roles";

export async function requireDemoUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function canViewMaterial(user: User, material: Material) {
  if (user.role !== "admin" && !user.courseIds.includes(material.courseId)) {
    return false;
  }
  if (user.role === "student" && !material.published) return false;
  return true;
}

export function canViewDeadline(user: User, deadline: Deadline) {
  if (user.role !== "admin" && !user.courseIds.includes(deadline.courseId)) {
    return false;
  }
  if (user.role === "student" && "materialId" in deadline.source) {
    const material = store.material(deadline.source.materialId);
    if (material && !material.published) return false;
  }
  return true;
}
