import Link from "next/link";
import { courseTermLabel } from "@/components/course-term";
import type { Course } from "@/lib/types";

export function TeacherCourseRow({
  course,
  materialCount,
  draftCount,
}: {
  course: Course;
  materialCount: number;
  draftCount: number;
}) {
  return (
    <Link
      href={`/teacher/${course.id}`}
      prefetch
      className="hover:bg-muted/40 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 transition-colors"
    >
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="font-medium">{course.code}</span>
          <span className="truncate text-sm">{course.title}</span>
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs">
          {courseTermLabel(course)} · {materialCount}{" "}
          {materialCount === 1 ? "material" : "materials"}
          {draftCount > 0
            ? ` · ${draftCount} ${draftCount === 1 ? "draft" : "drafts"}`
            : ""}
        </span>
      </span>
      <span className="text-muted-foreground shrink-0 text-sm">Edit</span>
    </Link>
  );
}
