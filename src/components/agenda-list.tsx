"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compareDueAt, formatDueAt, isOverdue } from "@/components/due-date";
import { Badge } from "@/components/ui/badge";

const STORAGE_KEY = "lms-agenda-done";

export type AgendaItem = {
  id: string;
  title: string;
  dueAt: string;
  href: string;
  code?: string;
};

export function AgendaList({ items }: { items: AgendaItem[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      setDone({});
    }
  }, []);

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (!items.length) {
    return <p className="text-muted-foreground text-sm">No deadlines yet.</p>;
  }

  const ordered = items.slice().sort((a, b) => compareDueAt(a.dueAt, b.dueAt));

  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((item) => {
        const overdue = isOverdue(item.dueAt);
        return (
          <li
            key={item.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
              overdue ? "border-destructive/40 bg-destructive/5" : ""
            }`}
          >
            <input
              type="checkbox"
              className="accent-primary size-4 shrink-0"
              checked={Boolean(done[item.id])}
              onChange={() => toggle(item.id)}
              aria-label={`Mark ${item.title} done`}
            />
            <Link
              href={item.href}
              prefetch
              className="hover:bg-muted/40 flex min-w-0 flex-1 items-center justify-between gap-4 rounded-md px-1 py-0.5 text-sm transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`min-w-0 ${done[item.id] ? "text-muted-foreground line-through" : ""}`}
                >
                  <span className="font-medium">{item.title}</span>
                  {item.code ? (
                    <span className="text-muted-foreground"> · {item.code}</span>
                  ) : null}
                </span>
                {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
              </span>
              <time
                dateTime={item.dueAt}
                className={`shrink-0 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
              >
                {formatDueAt(item.dueAt)}
              </time>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
