import { AskDialog } from "@/components/ask-dialog";
import { UserSwitcher } from "@/components/user-switcher";
import type { Course, User } from "@/lib/types";

export function AppTopbar({
  user,
  users,
  courses,
}: {
  user: User;
  users: User[];
  courses: Course[];
}) {
  const student = user.role === "student";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4 pr-14">
      <div className="min-w-0 flex-1">
        {student ? <AskDialog key={user.id} courses={courses} /> : null}
      </div>
      <UserSwitcher user={user} users={users} />
    </header>
  );
}
