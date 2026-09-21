import { notFound } from "next/navigation";
import { requireDemoUser } from "@/components/demo-session";
import { CourseHero } from "@/components/course-hero";
import { courseTermLabel } from "@/components/course-term";
import { visibleCourseModules, weekPath } from "@/components/course-modules";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { store } from "@/lib/store";
import Link from "next/link";

export default async function CoursePage({
  params,
}: PageProps<"/courses/[courseId]">) {
  const user = await requireDemoUser();
  const { courseId } = await params;
  const course = store.course(courseId);
  if (!course) notFound();
  if (user.role !== "admin" && !user.courseIds.includes(course.id)) notFound();

  const groups = visibleCourseModules(course, user);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <CourseHero course={course} />
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            {course.code}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {courseTermLabel(course)}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Open a week to see its lectures, assignments, and other materials.
          </p>
        </div>
      </div>
      <section className="grid gap-3 xl:grid-cols-2">
        {groups.map(({ module: mod, materials }) => (
          <Link key={mod.id} href={weekPath(course.id, mod.id)} prefetch>
            <Card className="hover:bg-muted/40 h-full transition-colors">
              <CardHeader>
                <CardTitle>{mod.title}</CardTitle>
                <CardDescription>
                  {materials.length === 0
                    ? "No materials yet"
                    : `${materials.length} ${materials.length === 1 ? "material" : "materials"}`}
                </CardDescription>
                {materials.length > 0 ? (
                  <ul className="text-muted-foreground mt-1 flex flex-col gap-0.5 text-sm">
                    {materials.slice(0, 3).map((material) => (
                      <li key={material.id} className="truncate">
                        {material.title}
                      </li>
                    ))}
                    {materials.length > 3 ? (
                      <li>+{materials.length - 3} more</li>
                    ) : null}
                  </ul>
                ) : null}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
