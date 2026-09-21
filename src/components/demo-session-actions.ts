"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  DEMO_USER_COOKIE,
  homePathFor,
} from "@/components/demo-session";
import { store } from "@/lib/store";

export async function switchUser(userId: string) {
  const user = store.user(userId);
  if (!user) redirect("/login");
  const jar = await cookies();
  jar.set(DEMO_USER_COOKIE, user.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  redirect(homePathFor(user.role));
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(DEMO_USER_COOKIE);
  redirect("/login");
}
