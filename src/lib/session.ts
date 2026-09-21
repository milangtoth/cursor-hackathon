import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "./types";

export const COOKIE_NAME = "lms_session";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  role: Role;
  exp: number;
};

function secret() {
  return process.env.SESSION_SECRET ?? "modernlms-demo-secret";
}

function hmac(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function signSession(userId: string, role: Role): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, role, exp: Date.now() + MAX_AGE_SECONDS * 1000 } satisfies SessionPayload)
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function readSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (!data.userId || !data.role || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
