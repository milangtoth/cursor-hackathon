import { canViewDeadline, requireDemoUser } from "@/components/demo-session";
import { AgendaList } from "@/components/agenda-list";
import { materialPath } from "@/components/course-modules";
import { store } from "@/lib/store";

export default async function AgendaPage() {
  const user = await requireDemoUser();
  const items = store
    .deadlines()
    .filter((deadline) => canViewDeadline(user, deadline))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((deadline) => {
      const course = store.course(deadline.courseId);
      const href =
        "materialId" in deadline.source
          ? materialPath(deadline.courseId, deadline.source.materialId, {
              page: deadline.source.page,
            })
          : `/courses/${deadline.courseId}`;
      return {
        id: deadline.id,
        title: deadline.title,
        dueAt: deadline.dueAt,
        href,
        code: course?.code,
      };
    });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-muted-foreground text-sm">
          Deadlines extracted from your materials. Check them off as you go.
        </p>
      </div>
      <AgendaList items={items} />
    </div>
  );
}
