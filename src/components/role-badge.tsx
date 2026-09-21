"use client";

import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/types";

const LABELS: Record<Role, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant="secondary">{LABELS[role]}</Badge>;
}
