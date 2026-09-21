"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Deadline, Material } from "@/lib/types";

export function TeacherMaterialList({
  courseId,
  materials,
  deadlines,
}: {
  courseId: string;
  materials: Material[];
  deadlines: Deadline[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(materialId: string) {
    setBusy(materialId);
    setError(null);
    try {
      const res = await fetch(`/api/materials?materialId=${encodeURIComponent(materialId)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function extract(materialId: string) {
    setBusy(materialId);
    setError(null);
    try {
      const res = await fetch("/api/extract-deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
      const data = (await res.json()) as { error?: string } | Deadline[];
      if (!res.ok || (data && !Array.isArray(data) && "error" in data)) {
        throw new Error(!Array.isArray(data) ? data.error ?? "Extract failed" : "Extract failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {materials.map((m) => {
        const extracted = deadlines.some(
          (d) => !("manual" in d.source) && d.source.materialId === m.id
        );
        return (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
          >
            <div className="min-w-0">
              <Link
                href={`/courses/${courseId}/${m.id}`}
                prefetch
                className="font-medium hover:underline"
              >
                {m.title}
              </Link>
              <p className="text-muted-foreground text-xs">
                {m.fileName} · {m.pageCount} pages
              </p>
            </div>
            <span className="flex items-center gap-1.5">
              {!m.published ? <Badge variant="secondary">Draft</Badge> : null}
              <Badge variant="outline">{m.kind === "assignment" ? "Assignment" : "PDF"}</Badge>
              {!extracted ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={busy === m.id}
                  onClick={() => extract(m.id)}
                >
                  Extract tasks
                </Button>
              ) : null}
              <Button
                type="button"
                size="xs"
                variant="destructive"
                disabled={busy === m.id}
                onClick={() => remove(m.id)}
              >
                Delete
              </Button>
            </span>
          </div>
        );
      })}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
