"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SummaryPanel({
  materialId,
  initialSummary,
}: {
  materialId: string;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestSummary(force: boolean) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, force }),
      });
      const data = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok || !data.summary) {
        throw new Error(data.error ?? "Summarize failed");
      }
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summarize failed");
    } finally {
      setPending(false);
    }
  }

  const hasSummary = Boolean(summary);

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle>Summary</CardTitle>
          <Button
            type="button"
            size="xs"
            variant={hasSummary ? "outline" : "default"}
            disabled={pending}
            className="shrink-0"
            onClick={() => requestSummary(hasSummary)}
          >
            <Sparkles data-icon="inline-start" />
            {pending ? "Working…" : hasSummary ? "Regenerate" : "Summarize"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm leading-relaxed">{summary}</p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Click Summarize for a short overview of this material.
          </p>
        )}
        {error ? (
          <p className="text-destructive mt-2 text-sm">{error}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
