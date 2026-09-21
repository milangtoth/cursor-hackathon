"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PipelineStatus, type PipelineItem } from "@/components/pipeline-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Module } from "@/lib/types";

type StepEvent = { type: "step"; step: string; detail?: string };
type DoneEvent = {
  type: "done";
  material: unknown;
  chunksAdded: number;
  deadlinesFound: number;
};
type ErrorEvent = { type: "error"; error: string };

export function UploadDropzone({
  courseId,
  modules,
}: {
  courseId: string;
  modules: Module[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [steps, setSteps] = useState<PipelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !moduleId) return;
    setPending(true);
    setError(null);
    setSteps([]);
    const form = new FormData();
    form.set("file", file);
    form.set("courseId", courseId);
    form.set("moduleId", moduleId);
    form.set("title", title.trim());
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { Accept: "application/x-ndjson" },
        body: form,
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("ndjson") || !res.body) {
        const data = (await res.json()) as { error?: string; chunksAdded?: number; deadlinesFound?: number };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setSteps([
          { step: "indexing", detail: `${data.chunksAdded ?? 0} chunks, ${data.deadlinesFound ?? 0} deadlines`, done: true },
        ]);
        router.refresh();
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StepEvent | DoneEvent | ErrorEvent;
          if (event.type === "step") {
            setSteps((prev) => {
              const next = prev.map((s) => (s.step === event.step ? { ...s, detail: event.detail, done: true } : s));
              if (!next.some((s) => s.step === event.step)) {
                next.push({ step: event.step, detail: event.detail, done: true });
              }
              return next;
            });
          } else if (event.type === "error") {
            setError(event.error);
          } else if (event.type === "done") {
            setSteps((prev) => [
              ...prev,
              {
                step: "indexing",
                detail: `${event.chunksAdded} chunks, ${event.deadlinesFound} deadlines`,
                done: true,
              },
            ]);
            router.refresh();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upload-title">Title</Label>
          <Input
            id="upload-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Capstone brief"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="upload-module">Module</Label>
          <select
            id="upload-module"
            className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
            value={moduleId}
            onChange={(e) => setModuleId(e.target.value)}
          >
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-file">PDF</Label>
        <Input
          id="upload-file"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </div>
      <Button type="submit" disabled={pending || !file || !title.trim()}>
        {pending ? "Ingesting…" : "Upload and ingest"}
      </Button>
      <PipelineStatus steps={steps} error={error} />
    </form>
  );
}
