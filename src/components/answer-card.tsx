import { Skeleton } from "@/components/ui/skeleton";

const NOT_FOUND = "not found in your materials";
const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_SOURCE = `\\b(?:\\d{1,2}\\s+${MONTH}(?:\\s+\\d{4})?|${MONTH}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b`;
const DATE_SPLIT = new RegExp(`(${DATE_SOURCE})`, "gi");
const DATE_EXACT = new RegExp(`^${DATE_SOURCE}$`, "i");

export function containsDate(text: string) {
  return new RegExp(DATE_SOURCE, "i").test(text);
}

function underlineDates(answer: string) {
  return answer.split(DATE_SPLIT).map((part, index) =>
    DATE_EXACT.test(part) ? (
      <time
        key={`${part}-${index}`}
        className="decoration-foreground/50 underline decoration-dotted underline-offset-2"
      >
        {part}
      </time>
    ) : (
      part
    )
  );
}

export function AnswerCard({
  question,
  answer,
  pending,
}: {
  question?: string;
  answer: string | null;
  pending: boolean;
}) {
  if (!answer && !pending) return null;

  const missing = answer?.toLowerCase() === NOT_FOUND;

  return (
    <div className="flex flex-col gap-2">
      {question ? (
        <p className="text-sm font-medium">{question}</p>
      ) : (
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Answer
        </p>
      )}
      {answer ? (
        <p
          className={
            missing
              ? "text-muted-foreground text-sm leading-relaxed"
              : "text-sm leading-relaxed"
          }
        >
          {underlineDates(answer)}
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
