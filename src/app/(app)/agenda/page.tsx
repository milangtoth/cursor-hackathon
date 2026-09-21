import Link from "next/link";
import { materialPath } from "@/components/course-modules";
import { canViewDeadline, requireDemoUser } from "@/components/demo-session";
import { formatDueAt } from "@/components/due-date";
import { store } from "@/lib/store";

export default async function AgendaPage() {
  const user = await requireDemoUser();
  const deadlines = store
    .deadlines()
    .filter((deadline) => canViewDeadline(user, deadline))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground text-sm">
          Deadlines extracted from your materials.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {deadlines.map((deadline) => {
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
    </div>
  );
}
