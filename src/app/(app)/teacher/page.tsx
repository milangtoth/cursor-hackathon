import { redirect } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { requireDemoUser } from "@/components/demo-session";
import { store } from "@/lib/store";

export default async function TeacherPage() {
  const user = await requireDemoUser();
  if (user.role !== "teacher" && user.role !== "admin") redirect("/");
  const courses = store.coursesForUser(user);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teaching</h1>
        <p className="text-muted-foreground text-sm">
          Unpublished drafts are visible when you open a course.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} href={`/teacher/${course.id}`} />
        ))}
      </div>
    </div>
  );
}
