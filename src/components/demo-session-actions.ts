"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homePathFor } from "@/components/demo-session";
import { COOKIE_NAME, sessionCookieOptions, signSession } from "@/lib/session";
import { store } from "@/lib/store";

export async function switchUser(userId: string) {
  const user = store.user(userId);
  if (!user) redirect("/login");
  const jar = await cookies();
  jar.set(COOKIE_NAME, signSession(user.id, user.role), sessionCookieOptions);
  redirect(homePathFor(user.role));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
  redirect("/login");
}
