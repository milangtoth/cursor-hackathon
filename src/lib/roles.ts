import type { Role } from "./types";

export function homePathFor(role: Role) {
  if (role === "teacher") return "/teacher";
  if (role === "admin") return "/admin";
  return "/";
}
