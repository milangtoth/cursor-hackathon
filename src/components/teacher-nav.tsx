"use client";

import { LayoutGrid } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import { courseTermLabel } from "@/components/course-term";
import type { Course } from "@/lib/types";

export function TeacherNav({ courses }: { courses: Course[] }) {
  return (
    <nav aria-label="Teaching" className="flex flex-col gap-4 p-3">
      <NavLink href="/teacher" exact>
        <LayoutGrid className="size-4" />
        All courses
      </NavLink>
      <div className="flex flex-col gap-1">
        <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Courses
        </p>
        <div className="flex flex-col gap-0.5">
          {courses.map((course) => (
            <NavLink key={course.id} href={`/teacher/${course.id}`}>
              <span className="flex min-w-0 flex-col items-start gap-0.5">
                <span className="font-medium">{course.code}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {courseTermLabel(course)}
                </span>
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
