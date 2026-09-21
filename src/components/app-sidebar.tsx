import { CalendarDays, GraduationCap, Home, Shield, Presentation } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Course, Role } from "@/lib/types";

export function AppSidebar({
  courses,
  role,
}: {
  courses: Course[];
  role: Role;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">ModernLMS</span>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Main" className="flex flex-col gap-4 p-3">
          <div className="flex flex-col gap-0.5">
            <NavLink href="/">
              <Home className="size-4" />
              Home
            </NavLink>
            <NavLink href="/agenda">
              <CalendarDays className="size-4" />
              Agenda
            </NavLink>
            {role === "teacher" ? (
              <NavLink href="/teacher">
                <Presentation className="size-4" />
                Teaching
              </NavLink>
            ) : null}
            {role === "admin" ? (
              <NavLink href="/admin">
                <Shield className="size-4" />
                Admin
              </NavLink>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Courses
            </p>
            <div className="flex flex-col gap-0.5">
              {courses.map((course) => (
                <NavLink key={course.id} href={`/courses/${course.id}`}>
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="font-medium">{course.code}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {course.title}
                    </span>
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </ScrollArea>
    </aside>
  );
}
