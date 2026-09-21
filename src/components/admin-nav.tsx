import { Shield } from "lucide-react";
import { NavLink } from "@/components/nav-link";

export function AdminNav() {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-4 p-3">
      <NavLink href="/admin" exact>
        <Shield className="size-4" />
        Directory
      </NavLink>
    </nav>
  );
}
