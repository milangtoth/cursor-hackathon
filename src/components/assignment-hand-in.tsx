"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDueAt } from "@/components/due-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Submission } from "@/lib/types";

export function AssignmentHandIn({
  materialId,
  dueAt,
  initial,
}: {
  materialId: string;
  dueAt?: string;
  initial: Submission | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(initial);

  const late = dueAt ? Date.parse(dueAt) < Date.now() : false;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    form.set("materialId", materialId);
    try {
      const res = await fetch("/api/submissions", { method: "POST", body: form });
      const data = (await res.json()) as Submission | { error?: string };
      if (!res.ok || !("id" in data)) {
        throw new Error(
          !("id" in data) ? data.error ?? "Could not submit" : "Could not submit",
        );
      }
      setCurrent(data);
      setFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium">Your submission</h2>
        {dueAt ? (
          <p className={late ? "text-destructive text-sm" : "text-muted-foreground text-sm"}>
            Due {formatDueAt(dueAt)}
            {late ? " · late" : ""}
          </p>
        ) : null}
      </div>
      {current ? (
        <p className="text-sm">
          Handed in {formatDueAt(current.submittedAt)} · {current.originalName}
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">Nothing handed in yet.</p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hand-in-file">PDF</Label>
          <Input
            id="hand-in-file"
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={pending || !file} className="w-fit">
          {pending ? "Uploading…" : current ? "Replace file" : "Hand in"}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </section>
  );
}
