"use client";

import { CalendarDays, Home } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { CourseTermFilters } from "@/components/course-term-filters";
import {
  filterCourses,
  parseTermFilters,
  termHref,
} from "@/components/course-term";
import { NavLink } from "@/components/nav-link";
import type { Block, Course } from "@/lib/types";

export function SidebarNav({ courses }: { courses: Course[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseTermFilters({
    block: searchParams.get("block") ?? undefined,
  });

  return (
    <SidebarNavContent
      courses={courses}
      filters={filters}
      basePath={pathname}
    />
  );
}

export function SidebarNavFallback({ courses }: { courses: Course[] }) {
  return (
    <SidebarNavContent courses={courses} filters={{}} basePath="/" />
  );
}

function SidebarNavContent({
  courses,
  filters,
  basePath,
}: {
  courses: Course[];
  filters: { block?: Block };
  basePath: string;
}) {
  const visible = filterCourses(courses, filters);

  return (
    <nav aria-label="Main" className="flex flex-col gap-4 p-3">
      <div className="flex flex-col gap-0.5">
        <NavLink href={termHref("/", filters)}>
          <Home className="size-4" />
          Home
        </NavLink>
        <NavLink href={termHref("/agenda", filters)}>
          <CalendarDays className="size-4" />
          Agenda
        </NavLink>
      </div>
      <div className="flex flex-col gap-2">
        <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Courses
        </p>
        <div className="px-1">
          <CourseTermFilters
            compact
            basePath={basePath}
            block={filters.block}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          {visible.length === 0 ? (
            <p className="text-muted-foreground px-2.5 text-xs">
              No courses in this term.
            </p>
          ) : (
            visible.map((course) => (
              <NavLink
                key={course.id}
                href={termHref(`/courses/${course.id}`, filters)}
              >
                <span className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="font-medium">{course.code}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {course.title} · Block {course.block}
                  </span>
                </span>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </nav>
  );
}
