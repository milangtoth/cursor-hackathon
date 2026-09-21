import { Skeleton } from "@/components/ui/skeleton";

const NOT_FOUND = "not found in your materials";

export function AnswerCard({
  answer,
  pending,
}: {
  answer: string | null;
  pending: boolean;
}) {
  if (!answer && !pending) return null;

  const missing = answer?.toLowerCase() === NOT_FOUND;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Answer
      </p>
      {answer ? (
        <p
          className={
            missing
              ? "text-muted-foreground text-sm leading-relaxed"
              : "text-sm leading-relaxed"
          }
        >
          {answer}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
      )}
    </div>
  );
}
