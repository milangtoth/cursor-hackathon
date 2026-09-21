"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EditMaterialDialog } from "@/components/edit-material-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Deadline, Material, Module } from "@/lib/types";

export function TeacherMaterialList({
  modules,
  materials,
  deadlines,
}: {
  modules: Module[];
  materials: Material[];
  deadlines: Deadline[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Material | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(materialId: string) {
    setBusy(materialId);
    setError(null);
    try {
      const res = await fetch(
        `/api/materials?materialId=${encodeURIComponent(materialId)}`,
        { method: "DELETE" },
      );
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
        throw new Error(
          !Array.isArray(data) ? data.error ?? "Extract failed" : "Extract failed",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extract failed");
    } finally {
      setBusy(null);
    }
  }

  const weeks = [...modules].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-5">
      {weeks.map((mod) => {
        const items = mod.materialIds
          .map((id) => materials.find((material) => material.id === id))
          .filter((material): material is Material => material != null);
        return (
          <div key={mod.id} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {mod.title}
            </p>
            {items.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing in this week yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((material) => {
                  const extracted = deadlines.some(
                    (deadline) =>
                      !("manual" in deadline.source) &&
                      deadline.source.materialId === material.id,
                  );
                  return (
                    <li
                      key={material.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{material.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {material.fileName} · {material.pageCount} pages
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5">
                        {!material.published ? (
                          <Badge variant="secondary">Draft</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {material.kind === "assignment" ? "Assignment" : "PDF"}
                        </Badge>
                        {!extracted ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            disabled={busy === material.id}
                            onClick={() => extract(material.id)}
                          >
                            Extract tasks
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          disabled={busy === material.id}
                          onClick={() => setEditing(material)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="destructive"
                          disabled={busy === material.id}
                          onClick={() => remove(material.id)}
                        >
                          Delete
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {editing ? (
        <EditMaterialDialog
          key={editing.id}
          material={editing}
          modules={modules}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
