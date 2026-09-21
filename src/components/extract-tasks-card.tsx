"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deadline } from "@/lib/types";

export function ExtractTasksCard({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<number | null>(null);

  async function extract() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
      const data = (await res.json()) as Deadline[] | { error?: string };
      if (!res.ok || !Array.isArray(data)) {
        throw new Error(!Array.isArray(data) ? data.error ?? "Extract failed" : "Extract failed");
      }
      setFound(data.length);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks in this document</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          This brief was left unindexed on purpose. Extract pulls deadlines into the agenda.
        </p>
        <Button type="button" size="sm" disabled={pending} onClick={() => void extract()}>
          {pending ? "Extracting…" : "Extract tasks from this document"}
        </Button>
        {found != null ? (
          <p className="text-sm">{found} deadline{found === 1 ? "" : "s"} added to Agenda.</p>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
