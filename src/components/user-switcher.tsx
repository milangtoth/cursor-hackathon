"use client";

import { ChevronsUpDown } from "lucide-react";
import { useSessionSwitch } from "@/components/use-session-switch";
import { RoleBadge } from "@/components/role-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

export function UserSwitcher({
  user,
  users,
}: {
  user: User;
  users: User[];
}) {
  const { loginAs, logout } = useSessionSwitch();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2" />
        }
      >
        <span className="text-sm font-medium whitespace-nowrap">{user.name}</span>
        <RoleBadge role={user.role} />
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch user</DropdownMenuLabel>
          {users.map((candidate) => (
            <DropdownMenuItem
              key={candidate.id}
              onClick={() => loginAs(candidate.id, candidate.role)}
              className="justify-between"
            >
              <span>{candidate.name}</span>
              <RoleBadge role={candidate.role} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logout()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
