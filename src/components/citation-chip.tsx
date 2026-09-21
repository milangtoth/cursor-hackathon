"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/types";

export function citationHref(citation: Citation) {
  const params = new URLSearchParams();
  params.set("page", String(citation.page));
  params.set("chunk", citation.chunkId);
  if (citation.snippet) params.set("q", citation.snippet);
  return `/courses/${citation.courseId}/${citation.materialId}?${params.toString()}`;
}

export function CitationChip({
  citation,
  onNavigate,
}: {
  citation: Citation;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const href = citationHref(citation);

  return (
    <Link
      href={href}
      prefetch
      onClick={(event) => {
        event.preventDefault();
        onNavigate?.();
        router.push(href);
      }}
      className="hover:bg-muted/50 block rounded-lg p-3 ring-1 ring-foreground/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <FileText className="text-muted-foreground size-3.5 shrink-0" />
          <span className="truncate">{citation.materialTitle}</span>
        </span>
        <Badge variant="outline">p. {citation.page}</Badge>
      </div>
      <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-relaxed">
        {citation.snippet}
      </p>
    </Link>
  );
}
