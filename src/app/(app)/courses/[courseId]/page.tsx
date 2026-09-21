import { notFound } from "next/navigation";
import { requireDemoUser } from "@/components/demo-session";
import { CourseHero } from "@/components/course-hero";
import { store } from "@/lib/store";

export default async function CoursePage({
  params,
}: PageProps<"/courses/[courseId]">) {
  const user = await requireDemoUser();
  const { courseId } = await params;
  const course = store.course(courseId);
  if (!course) notFound();
  if (user.role !== "admin" && !user.courseIds.includes(course.id)) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <CourseHero course={course} />
      <div>
        <p className="text-muted-foreground text-sm font-medium">{course.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Pick a material from the module list. The list stays put while you
          move between files.
        </p>
      </div>
    </div>
  );
}
