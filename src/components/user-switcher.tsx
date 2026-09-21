"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Monitor, Moon, Settings, Sun } from "lucide-react";
import { signOut, switchUser } from "@/components/demo-session-actions";
import { RoleBadge } from "@/components/role-badge";
import {
  persistTheme,
  readTheme,
  type ThemePreference,
} from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  const [theme, setTheme] = useState<ThemePreference>("system");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

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
              onClick={() => switchUser(candidate.id)}
              className="justify-between"
            >
              <span>{candidate.name}</span>
              <RoleBadge role={candidate.role} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Settings />
            Settings
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-40">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => {
                const next = value as ThemePreference;
                setTheme(next);
                persistTheme(next);
              }}
            >
              <DropdownMenuRadioItem value="system">
                <Monitor />
                System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                <Sun />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon />
                Dark
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
