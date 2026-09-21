import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getCurrentUser } from "@/components/demo-session";
import { visibleUsers } from "@/lib/roles";
import { store } from "@/lib/store";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/login");
  const courses = store.coursesForUser(user);

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar courses={courses} role={user.role} />
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <AppTopbar user={user} users={visibleUsers(store.users())} />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
