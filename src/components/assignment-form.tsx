"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AssignmentForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          dueAt: new Date(dueAt).toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create assignment");
      setTitle("");
      setDueAt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create assignment");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asg-title">Title</Label>
          <Input
            id="asg-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lab catch-up"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="asg-due">Due</Label>
          <Input
            id="asg-due"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending || !title.trim() || !dueAt}>
        {pending ? "Saving…" : "Add to agenda"}
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </form>
  );
}
