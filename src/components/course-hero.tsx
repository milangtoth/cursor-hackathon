import type { Course } from "@/lib/types";

export function CourseHero({ course }: { course: Course }) {
  if (!course.heroImage) return null;
  return (
    <img
      src={course.heroImage}
      alt=""
      className="aspect-video max-h-56 w-full rounded-xl object-cover"
    />
  );
}
