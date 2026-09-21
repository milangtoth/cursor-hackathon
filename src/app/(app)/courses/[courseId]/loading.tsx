import { Skeleton } from "@/components/ui/skeleton";

export default function CourseLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <Skeleton className="aspect-video max-h-56 w-full rounded-xl" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}
