import { notFound } from "next/navigation";
import Link from "next/link";
import { canViewMaterial, requireDemoUser } from "@/components/demo-session";
import { weekPath } from "@/components/course-modules";
import { MaterialViewer } from "@/components/material-viewer";
import { SummaryPanel } from "@/components/summary-panel";
import { Badge } from "@/components/ui/badge";
import { publicPdfExists, publicPdfPath, store } from "@/lib/store";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MaterialPage({
  params,
  searchParams,
}: PageProps<"/courses/[courseId]/[materialId]">) {
  const user = await requireDemoUser();
  const { courseId, materialId } = await params;
  const query = await searchParams;
  const course = store.course(courseId);
  const material = store.material(materialId);
  if (!course || !material || material.courseId !== course.id) notFound();
  if (!canViewMaterial(user, material)) notFound();

  const chunkId = firstParam(query.chunk);
  const chunk = chunkId ? store.chunk(chunkId) : undefined;
  const chunkForMaterial =
    chunk && chunk.materialId === material.id ? chunk : undefined;

  const pageFromQuery = Number(firstParam(query.page));
  const initialPage =
    Number.isFinite(pageFromQuery) && pageFromQuery > 0
      ? pageFromQuery
      : chunkForMaterial?.page;
  const highlight =
    firstParam(query.q) ??
    (chunkForMaterial ? chunkForMaterial.text.slice(0, 180) : undefined);

  const pdfHref = publicPdfExists(material.fileName)
    ? publicPdfPath(material.fileName)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            <Link
              href={weekPath(course.id, material.moduleId)}
              prefetch
              className="hover:text-foreground"
            >
              {course.code}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {material.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {material.pageCount} pages · {material.fileName}
          </p>
        </div>
        <span className="flex items-center gap-1.5">
          {!material.published ? (
            <Badge variant="secondary">Draft</Badge>
          ) : null}
          <Badge variant="outline">
            {material.kind === "assignment" ? "Assignment" : "PDF"}
          </Badge>
        </span>
      </div>
      <SummaryPanel
        materialId={material.id}
        initialSummary={store.summary(material.id)}
      />
      <MaterialViewer
        chunks={store.chunksByMaterial(material.id).map((entry) => ({
          page: entry.page,
          text: entry.text,
        }))}
        pageCount={material.pageCount}
        initialPage={initialPage}
        highlight={highlight}
        pdfHref={pdfHref}
      />
    </div>
  );
}
