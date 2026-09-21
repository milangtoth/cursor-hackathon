import { visibleCourseModules, weekPath } from "@/components/course-modules";
import { NavLink } from "@/components/nav-link";
import { WeekNavLink } from "@/components/week-nav-link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Course, User } from "@/lib/types";

export function ModuleTree({ course, user }: { course: Course; user: User }) {
  const groups = visibleCourseModules(course, user);

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
        <nav aria-label="Course modules" className="flex flex-col gap-0.5 p-3">
          {groups.map(({ module: mod, materials }) => (
            <WeekNavLink
              key={mod.id}
              href={weekPath(course.id, mod.id)}
              materialHrefs={materials.map(
                (material) => `/courses/${course.id}/${material.id}`
              )}
            >
              {mod.title}
            </WeekNavLink>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
