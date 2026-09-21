import { redirect } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { CourseTermFilters } from "@/components/course-term-filters";
import { filterCourses, parseTermFilters } from "@/components/course-term";
import { requireDemoUser } from "@/components/demo-session";
import { store } from "@/lib/store";

export default async function TeacherPage({
  searchParams,
}: PageProps<"/teacher">) {
  const user = await requireDemoUser();
  if (user.role !== "teacher" && user.role !== "admin") redirect("/");
  const filters = parseTermFilters(await searchParams);
  const courses = filterCourses(store.coursesForUser(user), filters);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teaching</h1>
        <p className="text-muted-foreground text-sm">
          Open a course to upload PDFs, publish drafts, and add deadlines.
        </p>
      </div>
      <CourseTermFilters
        basePath="/teacher"
        semester={filters.semester}
        block={filters.block}
      />
      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No courses in this term.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              href={`/teacher/${course.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
