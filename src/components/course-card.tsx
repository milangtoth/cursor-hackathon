import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Course } from "@/lib/types";

export function CourseCard({
  course,
  href,
}: {
  course: Course;
  href?: string;
}) {
  return (
    <Link href={href ?? `/courses/${course.id}`} prefetch>
      <Card className="hover:bg-muted/40 h-full transition-colors">
        {course.heroImage ? (
          <img
            src={course.heroImage}
            alt=""
            className="aspect-video w-full object-cover"
          />
        ) : null}
        <CardHeader>
          <CardDescription>{course.code}</CardDescription>
          <CardTitle>{course.title}</CardTitle>
          <CardDescription>{course.modules.length} modules</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
