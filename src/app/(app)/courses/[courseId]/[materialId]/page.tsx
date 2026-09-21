import { notFound } from "next/navigation";
import { canViewMaterial, requireDemoUser } from "@/components/demo-session";
import { Badge } from "@/components/ui/badge";
import { store } from "@/lib/store";

export default async function MaterialPage({
  params,
}: PageProps<"/courses/[courseId]/[materialId]">) {
  const user = await requireDemoUser();
  const { courseId, materialId } = await params;
  const course = store.course(courseId);
  const material = store.material(materialId);
  if (!course || !material || material.courseId !== course.id) notFound();
  if (!canViewMaterial(user, material)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            {course.code}
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
      <div className="bg-muted/40 text-muted-foreground flex min-h-72 items-center justify-center rounded-xl border border-dashed text-sm">
        PDF viewer next
      </div>
    </div>
  );
}
