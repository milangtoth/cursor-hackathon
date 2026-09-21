import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { SidebarNav, SidebarNavFallback } from "@/components/sidebar-nav";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <GraduationCap className="size-4" />
        </span>
        <span className="text-sm font-semibold tracking-tight">ModernLMS</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <Suspense fallback={<SidebarNavFallback courses={courses} role={role} />}>
          <SidebarNav courses={courses} role={role} />
        </Suspense>
      </ScrollArea>
    </aside>
  );
}
