import { redirect } from "next/navigation";
import { requireDemoUser } from "@/components/demo-session";
import { RoleBadge } from "@/components/role-badge";
import { store } from "@/lib/store";

export default async function AdminPage() {
  const user = await requireDemoUser();
  if (user.role !== "admin") redirect("/");
  const users = store.users();
  const courses = store.courses();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Read-only directory of users and courses.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Users</h2>
        <ul className="flex flex-col gap-2">
          {users.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="font-medium">{entry.name}</span>
              <RoleBadge role={entry.role} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Courses</h2>
        <ul className="flex flex-col gap-2">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{course.code}</span>
                <span className="text-muted-foreground"> · {course.title}</span>
              </span>
              <span className="text-muted-foreground shrink-0">
                {course.modules.length} modules
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
