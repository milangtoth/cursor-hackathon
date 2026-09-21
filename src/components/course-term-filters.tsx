import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Block, Semester } from "@/lib/types";
import { BLOCKS, SEMESTERS, semesterLabel, termHref } from "@/components/course-term";

export function CourseTermFilters({
  basePath,
  semester,
  block,
  compact = false,
}: {
  basePath: string;
  semester?: Semester;
  block?: Block;
  compact?: boolean;
}) {
  const chipSize = compact ? "xs" : "sm";
  return (
    <div className="flex flex-col gap-2">
      <FilterRow label="Semester" compact={compact}>
        <FilterChip
          href={termHref(basePath, { block })}
          active={!semester}
          size={chipSize}
        >
          All
        </FilterChip>
        {SEMESTERS.map((value) => (
          <FilterChip
            key={value}
            href={termHref(basePath, {
              semester: value,
              block,
            })}
            active={semester === value}
            size={chipSize}
          >
            {semesterLabel(value)}
          </FilterChip>
        ))}
      </FilterRow>
      <FilterRow label="Block" compact={compact}>
        <FilterChip
          href={termHref(basePath, { semester })}
          active={!block}
          size={chipSize}
        >
          All
        </FilterChip>
        {BLOCKS.map((value) => (
          <FilterChip
            key={value}
            href={termHref(basePath, {
              semester,
              block: value,
            })}
            active={block === value}
            size={chipSize}
          >
            {value}
          </FilterChip>
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({
  label,
  compact,
  children,
}: {
  label: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-col gap-1"
          : "flex flex-wrap items-center gap-1.5"
      }
    >
      <span
        className={
          compact
            ? "text-muted-foreground text-xs font-medium"
            : "text-muted-foreground w-16 text-xs font-medium"
        }
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  size,
  children,
}: {
  href: string;
  active: boolean;
  size: "xs" | "sm";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={buttonVariants({
        variant: active ? "default" : "outline",
        size,
      })}
    >
      {children}
    </Link>
  );
}
