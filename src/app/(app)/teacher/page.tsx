import { redirect } from "next/navigation";
import { CourseTermFilters } from "@/components/course-term-filters";
import { filterCourses, parseTermFilters } from "@/components/course-term";
import { requireDemoUser } from "@/components/demo-session";
import { TeacherCourseRow } from "@/components/teacher-course-row";
import { store } from "@/lib/store";

export default async function TeacherPage({
  searchParams,
}: PageProps<"/teacher">) {
  const user = await requireDemoUser();
  if (user.role !== "teacher" && user.role !== "admin") redirect("/");
  const filters = parseTermFilters(await searchParams);
  const courses = filterCourses(store.coursesForUser(user), filters);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teaching</h1>
        <p className="text-muted-foreground text-sm">
          Courses you can edit. Open one to ingest a PDF or add a deadline.
        </p>
      </div>
      <CourseTermFilters basePath="/teacher" block={filters.block} />
      {courses.length === 0 ? (
        <p className="text-muted-foreground text-sm">No courses in this term.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {courses.map((course) => {
            const materials = store.materialsByCourse(course.id);
            return (
              <li key={course.id}>
                <TeacherCourseRow
                  course={course}
                  materialCount={materials.length}
                  draftCount={materials.filter((material) => !material.published).length}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
