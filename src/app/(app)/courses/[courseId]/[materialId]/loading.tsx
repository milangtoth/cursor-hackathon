import { Skeleton } from "@/components/ui/skeleton";

export default function MaterialLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="min-h-72 w-full rounded-xl" />
    </div>
  );
}
