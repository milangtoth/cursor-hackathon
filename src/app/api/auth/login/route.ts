import { NextResponse } from "next/server";
import { z } from "zod";
import { store } from "@/lib/store";
import { COOKIE_NAME, sessionCookieOptions, signSession } from "@/lib/session";

const bodySchema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const user = store.user(parsed.data.userId);
  if (!user) {
    return NextResponse.json({ error: "unknown user" }, { status: 404 });
  }

  const res = NextResponse.json({ user });
  res.cookies.set(COOKIE_NAME, signSession(user.id, user.role), sessionCookieOptions);
  return res;
}
