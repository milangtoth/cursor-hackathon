import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { Block } from "@/lib/types";
import { BLOCKS, termHref } from "@/components/course-term";

export function CourseTermFilters({
  basePath,
  block,
  compact = false,
}: {
  basePath: string;
  block?: Block;
  compact?: boolean;
}) {
  const chipSize = compact ? "xs" : "sm";
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
        Block
      </span>
      <div className="flex flex-wrap items-center gap-1">
        <FilterChip
          href={termHref(basePath, {})}
          active={!block}
          size={chipSize}
        >
          All
        </FilterChip>
        {BLOCKS.map((value) => (
          <FilterChip
            key={value}
            href={termHref(basePath, { block: value })}
            active={block === value}
            size={chipSize}
          >
            {value}
          </FilterChip>
        ))}
      </div>
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
