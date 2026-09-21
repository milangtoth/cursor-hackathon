import { notFound } from "next/navigation";
import { requireDemoUser } from "@/components/demo-session";
import { ModuleTree } from "@/components/module-tree";
import { store } from "@/lib/store";

export default async function CourseLayout({
  children,
  params,
}: LayoutProps<"/courses/[courseId]">) {
  const user = await requireDemoUser();
  const { courseId } = await params;
  const course = store.course(courseId);
  if (!course) notFound();
  if (user.role !== "admin" && !user.courseIds.includes(course.id)) notFound();

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ModuleTree course={course} user={user} />
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
