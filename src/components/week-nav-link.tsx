"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function WeekNavLink({
  href,
  materialHrefs,
  children,
}: {
  href: string;
  materialHrefs: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href || materialHrefs.includes(pathname);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/70"
      )}
    >
      {children}
    </Link>
  );
}
