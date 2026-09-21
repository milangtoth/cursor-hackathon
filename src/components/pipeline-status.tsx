"use client";

const LABELS: Record<string, string> = {
  parsing: "Parsing pages",
  chunking: "Chunking",
  embedding: "Embedding",
  extracting: "Extracting deadlines",
  indexing: "Indexing",
};

export type PipelineItem = {
  step: string;
  detail?: string;
  done: boolean;
};

export function PipelineStatus({ steps, error }: { steps: PipelineItem[]; error?: string | null }) {
  if (!steps.length && !error) return null;
  return (
    <ol className="text-muted-foreground flex flex-col gap-1 text-sm">
      {steps.map((s) => (
        <li key={s.step} className={s.done ? "text-foreground" : ""}>
          {s.done ? "✓" : "…"} {LABELS[s.step] ?? s.step}
          {s.detail ? ` — ${s.detail}` : ""}
        </li>
      ))}
      {error ? <li className="text-destructive">{error}</li> : null}
    </ol>
  );
}
