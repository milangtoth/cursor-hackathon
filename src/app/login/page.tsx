import { LoginCards } from "@/components/login-cards";
import { store } from "@/lib/store";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">ModernLMS</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Pick a seeded user. This is a demo cookie, not production auth.
        </p>
      </div>
      <LoginCards users={store.users()} />
    </main>
  );
}
