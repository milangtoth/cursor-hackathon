import type { Role, User } from "./types";

export function homePathFor(role: Role) {
  if (role === "teacher") return "/teacher";
  return "/";
}

export function visibleUsers(users: User[]) {
  return users.filter((user) => user.role !== "admin");
}
