import type { Block, Course, Semester } from "@/lib/types";

export const BLOCKS: Block[] = [1, 2, 3, 4];

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseBlock(value?: string): Block | undefined {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
}

export function parseTermFilters(
  query: Record<string, string | string[] | undefined>,
) {
  return {
    block: parseBlock(firstParam(query.block)),
  };
}

export function semesterLabel(semester: Semester) {
  return semester === "fall" ? "Fall" : "Spring";
}

export function courseTermLabel(course: Pick<Course, "year" | "semester" | "block">) {
  return `${semesterLabel(course.semester)} ${course.year} · Block ${course.block}`;
}

export function filterCourses(
  courses: Course[],
  filters: { block?: Block },
) {
  return courses.filter((course) => {
    if (filters.block && course.block !== filters.block) return false;
    return true;
  });
}

export function termHref(basePath: string, next: { block?: Block }) {
  const params = new URLSearchParams();
  if (next.block) params.set("block", String(next.block));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
