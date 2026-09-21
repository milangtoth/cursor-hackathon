import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";
import { materialPath } from "@/components/course-modules";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { store } from "@/lib/store";
import type { Material } from "@/lib/types";

export function MaterialCard({
  courseId,
  material,
  showDraft,
  submitted,
}: {
  courseId: string;
  material: Material;
  showDraft: boolean;
  submitted?: boolean;
}) {
  const summary = store.summary(material.id);
  const isAssignment = material.kind === "assignment";
  const Icon = isAssignment ? ClipboardList : FileText;

  return (
    <Link href={materialPath(courseId, material.id)} prefetch>
      <Card className="hover:bg-muted/40 h-full transition-colors">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-4" />
            </span>
            <span className="flex items-center gap-1.5">
              {showDraft && !material.published ? (
                <Badge variant="secondary">Draft</Badge>
              ) : null}
              {submitted ? <Badge>Handed in</Badge> : null}
              <Badge variant="outline">
                {isAssignment ? "Assignment" : "Lecture"}
              </Badge>
            </span>
          </div>
          <CardTitle className="mt-2">{material.title}</CardTitle>
          <CardDescription>
            {material.pageCount} pages · {material.fileName}
          </CardDescription>
          {summary ? (
            <CardDescription className="line-clamp-3">{summary}</CardDescription>
          ) : null}
        </CardHeader>
      </Card>
    </Link>
  );
}
