import type { Block, Course, Semester } from "@/lib/types";

export const SEMESTERS: Semester[] = ["fall", "spring"];
export const BLOCKS: Block[] = [1, 2, 3, 4];

export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseSemester(value?: string): Semester | undefined {
  if (value === "fall" || value === "spring") return value;
}

export function parseBlock(value?: string): Block | undefined {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
}

export function parseTermFilters(
  query: Record<string, string | string[] | undefined>,
) {
  return {
    semester: parseSemester(firstParam(query.semester)),
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
  filters: { semester?: Semester; block?: Block },
) {
  return courses.filter((course) => {
    if (filters.semester && course.semester !== filters.semester) return false;
    if (filters.block && course.block !== filters.block) return false;
    return true;
  });
}

export function termHref(
  basePath: string,
  next: { semester?: Semester; block?: Block },
) {
  const params = new URLSearchParams();
  if (next.semester) params.set("semester", next.semester);
  if (next.block) params.set("block", String(next.block));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
