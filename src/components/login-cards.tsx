"use client";

import { switchUser } from "@/components/demo-session-actions";
import { RoleBadge } from "@/components/role-badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/lib/types";

export function LoginCards({ users }: { users: User[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {users.map((user) => (
        <li key={user.id}>
          <button
            type="button"
            onClick={() => switchUser(user.id)}
            className="w-full text-left"
          >
            <Card className="hover:bg-accent/50 hover:ring-primary/40 h-full transition-colors hover:ring-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{user.name}</CardTitle>
                  <RoleBadge role={user.role} />
                </div>
                <CardDescription>
                  Continue as {user.role}
                </CardDescription>
              </CardHeader>
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
