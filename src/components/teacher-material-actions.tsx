"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PublishToggle({
  materialId,
  published,
}: {
  materialId: string;
  published: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, published: !published }),
      });
      if (!res.ok) return;
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      disabled={pending}
      onClick={toggle}
    >
      {published ? "Unpublish" : "Publish"}
    </Button>
  );
}

export function DeleteMaterialButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(
        `/api/materials?materialId=${encodeURIComponent(materialId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size="xs"
      variant="destructive"
      disabled={pending}
      onClick={remove}
    >
      {pending ? "Removing…" : "Delete"}
    </Button>
  );
}

export function ExtractTasksButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);

  async function extract() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
      const data = (await res.json()) as { error?: string } | unknown[];
      if (!res.ok) {
        throw new Error(
          data && !Array.isArray(data) && data.error ? data.error : "Extract failed"
        );
      }
      const found = Array.isArray(data) ? data.length : 0;
      setCount(found);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size="xs"
        variant="default"
        disabled={pending}
        onClick={extract}
      >
        {pending ? "Extracting…" : "Extract tasks from this document"}
      </Button>
      {count != null ? (
        <span className="text-muted-foreground text-xs">
          {count === 0 ? "No deadlines found" : `${count} added to agenda`}
        </span>
      ) : null}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </span>
  );
}
