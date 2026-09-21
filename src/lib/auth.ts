import { cookies } from "next/headers";
import { store } from "./store";
import { COOKIE_NAME, readSession } from "./session";
import type { Role, User } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = readSession(token);
  if (!session) return null;
  return store.user(session.userId) ?? null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "unauthenticated");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, "forbidden");
  return user;
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
