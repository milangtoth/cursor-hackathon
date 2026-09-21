export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-3 p-8">
      <p className="text-sm font-medium text-muted-foreground">ModernLMS</p>
      <h1 className="text-3xl font-semibold tracking-tight">Scaffold is up.</h1>
      <p className="text-muted-foreground">
        Fixtures live in <code className="font-mono text-sm">data/</code>. Student B: app
        shell, dashboard, course layout. Student A: store, ingest, Gemini.
      </p>
    </main>
  );
}
