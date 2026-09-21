import { canViewMaterial } from "@/components/demo-session";
import { NavLink } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { store } from "@/lib/store";
import type { Course, User } from "@/lib/types";

export function ModuleTree({ course, user }: { course: Course; user: User }) {
  const materials = store
    .materialsByCourse(course.id)
    .filter((material) => canViewMaterial(user, material));
  const materialById = new Map(
    materials.map((material) => [material.id, material])
  );
  const modules = [...course.modules].sort((a, b) => a.order - b.order);
  const showDraft = user.role !== "student";

  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-3">
        <NavLink href={`/courses/${course.id}`} exact>
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <span className="font-medium">{course.code}</span>
            <span className="line-clamp-2 text-xs font-normal text-muted-foreground">
              {course.title}
            </span>
          </span>
        </NavLink>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Course modules" className="flex flex-col gap-4 p-3">
          {modules.map((mod) => {
            const items = mod.materialIds
              .map((id) => materialById.get(id))
              .filter((material) => material != null);
            if (items.length === 0) return null;
            return (
              <div key={mod.id} className="flex flex-col gap-1">
                <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {mod.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((material) => (
                    <NavLink
                      key={material.id}
                      href={`/courses/${course.id}/${material.id}`}
                      exact
                    >
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        <span className="line-clamp-2">{material.title}</span>
                        <span className="flex items-center gap-1">
                          {showDraft && !material.published ? (
                            <Badge variant="secondary">Draft</Badge>
                          ) : null}
                          <Badge variant="outline">
                            {material.kind === "assignment"
                              ? "Assignment"
                              : "PDF"}
                          </Badge>
                        </span>
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
