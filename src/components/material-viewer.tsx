"use client";

import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type ViewerPage = {
  page: number;
  text: string;
};

function pagesFromChunks(
  pageCount: number,
  chunks: { page: number; text: string }[]
): ViewerPage[] {
  const byPage = new Map<number, string[]>();
  for (const chunk of [...chunks].sort((a, b) => a.page - b.page)) {
    const list = byPage.get(chunk.page) ?? [];
    list.push(chunk.text);
    byPage.set(chunk.page, list);
  }
  const last = Math.max(pageCount, ...byPage.keys(), 0);
  const pages: ViewerPage[] = [];
  for (let page = 1; page <= last; page++) {
    pages.push({ page, text: (byPage.get(page) ?? []).join("\n\n") });
  }
  return pages;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query?: string) {
  if (!query?.trim()) return text;
  const words = query
    .replace(/\.\.\.$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 16);
  if (words.length === 0) return text;
  const pattern = words.map(escapeRegex).join("\\s+");
  const match = new RegExp(pattern, "i").exec(text);
  if (!match) return text;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {text.slice(0, start)}
      <mark
        id="material-highlight"
        className="bg-primary/55 text-foreground scroll-mt-8 rounded-sm px-0.5"
      >
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

export function MaterialViewer({
  chunks,
  pageCount,
  initialPage,
  highlight,
  pdfHref,
}: {
  chunks: ViewerPage[];
  pageCount: number;
  initialPage?: number;
  highlight?: string;
  pdfHref?: string | null;
}) {
  const pages = pagesFromChunks(pageCount, chunks);
  const hasText = pages.some((page) => page.text.trim().length > 0);

  useEffect(() => {
    const target =
      document.getElementById("material-highlight") ??
      (initialPage != null
        ? document.getElementById(`page-${initialPage}`)
        : null);
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [initialPage, highlight]);

  if (!hasText) {
    return (
      <div className="bg-muted/40 text-muted-foreground flex min-h-72 items-center justify-center rounded-xl border border-dashed px-6 text-center text-sm">
        No text layer found. OCR is on the roadmap.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-background/95 sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-1">
          {pages.map((page) => (
            <Button
              key={page.page}
              type="button"
              size="xs"
              variant={page.page === initialPage ? "default" : "outline"}
              onClick={() =>
                document
                  .getElementById(`page-${page.page}`)
                  ?.scrollIntoView({ block: "start", behavior: "smooth" })
              }
            >
              Page {page.page}
            </Button>
          ))}
        </div>
        {pdfHref ? (
          <a
            href={
              initialPage
                ? `${pdfHref}#page=${initialPage}`
                : pdfHref
            }
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <ExternalLink className="size-3.5" />
            Original PDF
          </a>
        ) : null}
      </div>
      <div className="flex flex-col gap-4">
        {pages.map((page) => (
          <article
            key={page.page}
            id={`page-${page.page}`}
            className={cn(
              "bg-card scroll-mt-14 rounded-xl p-6 ring-1 ring-foreground/10",
              page.page === initialPage ? "ring-primary/50" : null
            )}
          >
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Page {page.page} of {pages.length}
            </p>
            {page.text.trim() ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {highlightText(page.text, highlight)}
              </p>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No text on this page.
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
