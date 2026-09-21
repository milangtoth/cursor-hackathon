"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PipelineStatus, type PipelineItem } from "@/components/pipeline-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Material, Module } from "@/lib/types";

type StepEvent = { type: "step"; step: string; detail?: string };
type DoneEvent = {
  type: "done";
  material: unknown;
  chunksAdded: number;
  deadlinesFound: number;
};
type ErrorEvent = { type: "error"; error: string };

export function EditMaterialDialog({
  material,
  modules,
  onClose,
}: {
  material: Material;
  modules: Module[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(material.title);
  const [moduleId, setModuleId] = useState(material.moduleId);
  const [published, setPublished] = useState(material.published);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [steps, setSteps] = useState<PipelineItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !moduleId) return;
    setPending(true);
    setError(null);
    setSteps([]);

    const form = new FormData();
    form.set("materialId", material.id);
    form.set("title", title.trim());
    form.set("moduleId", moduleId);
    form.set("published", published ? "true" : "false");
    if (file) form.set("file", file);

    try {
      const res = await fetch("/api/materials", {
        method: "PATCH",
        headers: file ? { Accept: "application/x-ndjson" } : undefined,
        body: form,
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("ndjson") || !res.body) {
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        router.refresh();
        onClose();
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
              const next = prev.map((s) =>
                s.step === event.step ? { ...s, detail: event.detail, done: true } : s,
              );
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
            onClose();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Edit upload</DialogTitle>
          <DialogDescription>
            Change the title or week, hide it from students, or replace the PDF.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-module">Week</Label>
              <select
                id="edit-module"
                className="border-input bg-background h-8 rounded-lg border px-2.5 text-sm"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
              >
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Visible to students
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-file">Replace PDF</Label>
            <Input
              id="edit-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-muted-foreground text-xs">
              Leave empty to keep {material.fileName}. A new file is re-ingested.
            </p>
          </div>
          <PipelineStatus steps={steps} error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? (file ? "Ingesting…" : "Saving…") : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
