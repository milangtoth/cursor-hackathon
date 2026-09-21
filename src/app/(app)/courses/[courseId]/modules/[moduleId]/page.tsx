import { notFound } from "next/navigation";
import { requireDemoUser } from "@/components/demo-session";
import { visibleCourseModules } from "@/components/course-modules";
import { MaterialCard } from "@/components/material-card";
import { store } from "@/lib/store";

export default async function WeekDashboardPage({
  params,
}: PageProps<"/courses/[courseId]/modules/[moduleId]">) {
  const user = await requireDemoUser();
  const { courseId, moduleId } = await params;
  const course = store.course(courseId);
  if (!course) notFound();
  if (user.role !== "admin" && !user.courseIds.includes(course.id)) notFound();

  const group = visibleCourseModules(course, user).find(
    (entry) => entry.module.id === moduleId
  );
  const mod = course.modules.find((entry) => entry.id === moduleId);
  if (!mod || !group) notFound();

  const showDraft = user.role !== "student";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <p className="text-muted-foreground text-sm font-medium">{course.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{mod.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {group.materials.length === 0
            ? "Nothing uploaded to this week yet."
            : "Lectures, assignments, and other files for this week."}
        </p>
      </div>
      {group.materials.length === 0 ? null : (
        <section className="grid gap-3 xl:grid-cols-2">
          {group.materials.map((material) => (
            <MaterialCard
              key={material.id}
              courseId={course.id}
              material={material}
              showDraft={showDraft}
            />
          ))}
        </section>
      )}
    </div>
  );
}
