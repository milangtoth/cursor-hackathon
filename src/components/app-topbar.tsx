import { AskDialog } from "@/components/ask-dialog";
import { UserSwitcher } from "@/components/user-switcher";
import type { User } from "@/lib/types";

export function AppTopbar({ user, users }: { user: User; users: User[] }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 pr-14">
      <div className="min-w-0 flex-1">
        <AskDialog key={user.id} />
      </div>
      <UserSwitcher user={user} users={users} />
    </header>
  );
}
