import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { store } from "@/lib/store";
import type { Deadline, Material, Role, User } from "@/lib/types";

export const DEMO_USER_COOKIE = "lms-demo-user";

export function homePathFor(role: Role) {
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/";
}

export async function getCurrentUser() {
  const jar = await cookies();
  const id = jar.get(DEMO_USER_COOKIE)?.value;
  if (!id) return null;
  return store.user(id) ?? null;
}

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
