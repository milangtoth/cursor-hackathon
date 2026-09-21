import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { materialPath } from "@/components/course-modules";
import { CourseTermFilters } from "@/components/course-term-filters";
import { filterCourses, parseTermFilters } from "@/components/course-term";
import { formatDueAt } from "@/components/due-date";
import { canViewDeadline, requireDemoUser } from "@/components/demo-session";
import { store } from "@/lib/store";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await requireDemoUser();
  const filters = parseTermFilters(await searchParams);
  const courses = filterCourses(store.coursesForUser(user), filters);
  const now = Date.now();
  const upcoming = store
    .deadlines()
    .filter((deadline) => canViewDeadline(user, deadline))
    .filter((deadline) => new Date(deadline.dueAt).getTime() >= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          Your courses and upcoming deadlines.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Courses</h2>
        <CourseTermFilters
          basePath="/"
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
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing due right now.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((deadline) => {
              const course = store.course(deadline.courseId);
              const href =
                "materialId" in deadline.source
                  ? materialPath(deadline.courseId, deadline.source.materialId, {
                      page: deadline.source.page,
                    })
                  : `/courses/${deadline.courseId}`;
              return (
                <li key={deadline.id}>
                  <Link
                    href={href}
                    prefetch
                    className="hover:bg-muted/40 flex items-baseline justify-between gap-4 rounded-lg border px-3 py-2 text-sm transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{deadline.title}</span>
                      {course ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {course.code}
                        </span>
                      ) : null}
                    </span>
                    <time
                      dateTime={deadline.dueAt}
                      className="text-muted-foreground shrink-0"
                    >
                      {formatDueAt(deadline.dueAt)}
                    </time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
