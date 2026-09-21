"use client";

import { useRouter } from "next/navigation";
import { homePathFor } from "@/lib/roles";
import type { Role } from "@/lib/types";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "request failed");
  }
  return res.json() as Promise<{ user?: { role: Role } }>;
}

export function useSessionSwitch() {
  const router = useRouter();

  async function loginAs(userId: string, role: Role) {
    await postJson("/api/auth/login", { userId });
    router.push(homePathFor(role));
    router.refresh();
  }

  async function logout() {
    await postJson("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return { loginAs, logout };
}
