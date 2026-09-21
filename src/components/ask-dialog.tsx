"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Calculator,
  CalendarDays,
  ExternalLink,
  ListRestart,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnswerCard, containsDate } from "@/components/answer-card";
import { CitationChip, citationHref } from "@/components/citation-chip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCalc, tryCalc } from "@/lib/calc";
import type { Citation, Course } from "@/lib/types";

const SUGGESTIONS = [
  "When is my deadline for Databases?",
  "What is Assignment 1 in Algorithms?",
  "When is the DB201 midterm?",
];
const HISTORY_KEY = "modernlms-ask-history";

type AskCommand = {
  command: string;
  label: string;
  icon: LucideIcon;
  tool?: AskTool;
};

type AskTool = "summarize" | "deadlines";

const TOOL_CONFIG: Record<
  AskTool,
  { label: string; placeholder: string; icon: LucideIcon }
> = {
  summarize: {
    label: "Summarize",
    placeholder: "What should I summarize?",
    icon: Sparkles,
  },
  deadlines: {
    label: "Find deadlines",
    placeholder: "Optionally narrow the deadlines…",
    icon: CalendarDays,
  },
};

const COMMANDS: AskCommand[] = [
  {
    command: "/course",
    label: "Restrict answers to one course",
    icon: BookOpen,
  },
  {
    command: "/summarize",
    label: "Prepare a course overview",
    icon: Sparkles,
    tool: "summarize",
  },
  {
    command: "/deadlines",
    label: "Find upcoming due dates",
    icon: CalendarDays,
    tool: "deadlines",
  },
  {
    command: "/clear",
    label: "Clear this conversation",
    icon: ListRestart,
  },
];

function friendlyAskError(message: string) {
  if (/high demand|UNAVAILABLE|503/i.test(message)) {
    return "The model is busy right now. You can still open a source below.";
  }
  if (message.trim().startsWith("{") || message.length > 160) {
    return "Couldn't generate an answer. You can still open a source below.";
  }
  return message;
}

type AskEvent =
  | { type: "citations"; citations: Citation[] }
  | {
      type: "answer";
      answer: string;
      citations: Citation[];
      followUps?: string[];
    }
  | { type: "error"; error: string };

type Turn = {
  question: string;
  query: string;
  answer: string | null;
  citations: Citation[];
  followUps: string[];
};

async function readAskEvents(
  res: Response,
  onEvent: (event: AskEvent) => void
) {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("ndjson") || !res.body) {
    const data = (await res.json()) as AskEvent | {
      answer?: string;
      citations?: Citation[];
      followUps?: string[];
      error?: string;
    };
    if ("type" in data && data.type) {
      onEvent(data as AskEvent);
      return;
    }
    if ("error" in data && data.error) {
      onEvent({ type: "error", error: data.error });
      return;
    }
    onEvent({ type: "citations", citations: data.citations ?? [] });
    onEvent({
      type: "answer",
      answer: data.answer ?? "",
      citations: data.citations ?? [],
      followUps: data.followUps ?? [],
    });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as AskEvent);
    }
  }
  if (buf.trim()) onEvent(JSON.parse(buf) as AskEvent);
}

function patchLastTurn(turns: Turn[], patch: Partial<Turn>): Turn[] {
  if (turns.length === 0) return turns;
  const next = [...turns];
  next[next.length - 1] = { ...next[next.length - 1], ...patch };
  return next;
}

export function AskDialog({
  courses,
}: {
  courses: Pick<Course, "id" | "code" | "title">[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<AskTool | null>(null);
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<"searching" | "generating" | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const [commandIndex, setCommandIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetThread() {
    abortRef.current?.abort();
    abortRef.current = null;
    setTurns([]);
    setDraft("");
    setSelectedCourseId(null);
    setActiveTool(null);
    setError(null);
    setPending(false);
    setStage(null);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (
        open &&
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "Backspace"
      ) {
        event.preventDefault();
        resetThread();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function loadRecentQuestions() {
    const stored = window.localStorage.getItem(HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentQuestions(
          parsed.filter((item): item is string => typeof item === "string").slice(0, 5)
        );
      }
    } catch {
      window.localStorage.removeItem(HISTORY_KEY);
    }
  }

  function applyRouteScope() {
    if (selectedCourseId) return;
    const routeCourseId = pathname.match(/^\/courses\/([^/]+)/)?.[1];
    if (routeCourseId && courses.some((course) => course.id === routeCourseId)) {
      setSelectedCourseId(routeCourseId);
    }
  }

  useEffect(() => {
    if (open && !pending) inputRef.current?.focus();
  }, [open, pending, turns.length]);

  function rememberQuestion(question: string) {
    setRecentQuestions((current) => {
      const next = [question, ...current.filter((item) => item !== question)].slice(0, 5);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }

  function applyCommand(command: AskCommand) {
    if (command.command === "/clear") {
      resetThread();
      return;
    }
    if (command.command === "/course") {
      setDraft("/course");
      setCommandIndex(0);
      return;
    }
    if (command.tool) setActiveTool(command.tool);
    setDraft("");
    setCommandIndex(0);
    inputRef.current?.focus();
  }

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed && !activeTool) return;

    const tool = activeTool;
    const toolConfig = tool ? TOOL_CONFIG[tool] : null;
    const submittedQuestion =
      tool === "summarize"
        ? trimmed
          ? `Summarize this topic from my materials: ${trimmed}`
          : "Summarize this course week by week from my materials. Cover every week that has lecture notes; do not skip a week."
        : tool === "deadlines"
          ? trimmed
            ? `Find deadlines in my materials related to: ${trimmed}`
            : "What are my upcoming deadlines?"
          : trimmed;
    const displayedQuestion = toolConfig
      ? `${toolConfig.label}${trimmed ? ` · ${trimmed}` : ""}`
      : trimmed;

    if (!tool && tryCalc(trimmed) != null) {
      abortRef.current?.abort();
      setDraft(trimmed);
      setPending(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const history = turns
      .filter((turn) => turn.answer)
      .slice(-4)
      .map((turn) => ({ question: turn.query, answer: turn.answer! }));

    setDraft("");
    setActiveTool(null);
    setPending(true);
    setStage("searching");
    setError(null);
    rememberQuestion(submittedQuestion);
    setTurns((prev) => [
      ...prev.filter((turn) => turn.answer != null),
      {
        question: displayedQuestion,
        query: submittedQuestion,
        answer: null,
        citations: [],
        followUps: [],
      },
    ]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: submittedQuestion,
          history,
          courseId: selectedCourseId ?? undefined,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Ask failed");
      }

      await readAskEvents(res, (event) => {
        if (event.type === "citations") {
          setStage("generating");
          setTurns((prev) => patchLastTurn(prev, { citations: event.citations }));
        } else if (event.type === "answer") {
          setStage(null);
          setTurns((prev) =>
            patchLastTurn(prev, {
              answer: event.answer,
              followUps: event.followUps ?? [],
              citations: event.citations.length
                ? event.citations
                : prev[prev.length - 1]?.citations ?? [],
            })
          );
        } else if (event.type === "error") {
          setStage(null);
          setError(event.error);
        }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      if (abortRef.current === ac) {
        setPending(false);
        setStage(null);
      }
    }
  }

  const calc = activeTool ? null : tryCalc(draft);
  const hasResults = pending || turns.length > 0;
  const followUp = turns.some((turn) => turn.answer);
  const normalizedDraft = draft.trim().toLowerCase();
  const courseCommandOpen = normalizedDraft === "/course";
  const commandMenuOpen =
    normalizedDraft.startsWith("/") && !courseCommandOpen;
  const filteredCommands = commandMenuOpen
    ? COMMANDS.filter((command) => command.command.startsWith(normalizedDraft))
    : [];
  const activeCommand =
    filteredCommands[Math.min(commandIndex, filteredCommands.length - 1)];
  const selectedCourse = courses.find(
    (course) => course.id === selectedCourseId
  );
  const activeToolConfig = activeTool ? TOOL_CONFIG[activeTool] : null;
  const ActiveToolIcon = activeToolConfig?.icon;

  const form = (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (courseCommandOpen) return;
        if (commandMenuOpen && activeCommand) {
          applyCommand(activeCommand);
          return;
        }
        void ask(draft);
      }}
    >
      {selectedCourse || activeToolConfig ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourse ? (
            <div className="bg-muted flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium">
              <BookOpen className="size-3.5" />
              Scoped to {selectedCourse.code}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${selectedCourse.code} course scope`}
                onClick={() => setSelectedCourseId(null)}
              >
                <X />
              </Button>
            </div>
          ) : null}
          {activeToolConfig && ActiveToolIcon ? (
            <div className="bg-primary/15 flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium">
              <ActiveToolIcon className="size-3.5" />
              {activeToolConfig.label}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${activeToolConfig.label} tool`}
                onClick={() => setActiveTool(null)}
              >
                <X />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setCommandIndex(0);
          }}
          onKeyDown={(event) => {
            if (!commandMenuOpen || filteredCommands.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCommandIndex((index) => (index + 1) % filteredCommands.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCommandIndex(
                (index) =>
                  (index - 1 + filteredCommands.length) % filteredCommands.length
              );
            } else if (event.key === "Enter" && activeCommand) {
              event.preventDefault();
              applyCommand(activeCommand);
            }
          }}
          placeholder={
            activeToolConfig
              ? activeToolConfig.placeholder
              : followUp
                ? "Ask a follow-up, or type /…"
                : "Ask anything, or type /"
          }
          autoFocus
        />
        <Button
          type="submit"
          disabled={
            pending ||
            (!draft.trim() && !activeTool) ||
            courseCommandOpen ||
            (commandMenuOpen && filteredCommands.length === 0)
          }
        >
          {pending ? "Asking…" : followUp ? "Follow up" : "Ask"}
        </Button>
      </div>
      {commandMenuOpen && filteredCommands.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-lg border p-1.5">
          <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
            Tools
          </p>
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <Button
                key={command.command}
                type="button"
                variant="ghost"
                className={
                  index === commandIndex
                    ? "bg-muted h-auto justify-start px-2.5 py-2 text-left"
                    : "h-auto justify-start px-2.5 py-2 text-left"
                }
                onClick={() => applyCommand(command)}
              >
                <Icon />
                <span className="font-mono text-xs">{command.command}</span>
                <span className="text-muted-foreground truncate">
                  {command.label}
                </span>
              </Button>
            );
          })}
        </div>
      ) : null}
      {courseCommandOpen ? (
        <div className="flex flex-col gap-1 rounded-lg border p-1.5">
          <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
            Choose a course
          </p>
          {courses.map((course) => (
            <Button
              key={course.id}
              type="button"
              variant="ghost"
              className="h-auto justify-start px-2.5 py-2 text-left"
              onClick={() => {
                setSelectedCourseId(course.id);
                setTurns([]);
                setError(null);
                setDraft("");
                inputRef.current?.focus();
              }}
            >
              <span className="font-semibold">{course.code}</span>
              <span className="text-muted-foreground truncate">
                {course.title}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </form>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          loadRecentQuestions();
          applyRouteScope();
        } else {
          resetThread();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="text-muted-foreground w-full max-w-sm justify-start"
          />
        }
      >
        <Search data-icon="inline-start" />
        Ask your materials
        <kbd className="bg-muted text-muted-foreground pointer-events-none ml-auto rounded-md border px-1.5 font-mono text-[10px] font-medium">
          ⌘K
        </kbd>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Ask your materials</DialogTitle>
          <DialogDescription>
            Search, calculate, or type / to use a tool.
          </DialogDescription>
        </DialogHeader>
        {calc != null ? (
          <div className="flex items-baseline gap-3 rounded-lg border px-3 py-3">
            <Calculator className="text-muted-foreground size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Calculator
              </p>
              <p className="font-mono text-2xl tracking-tight">{formatCalc(calc)}</p>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm">{friendlyAskError(error)}</p>
        ) : null}
        {calc != null ? (
          form
        ) : !hasResults ? (
          <>
            {form}
            {recentQuestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Recent
                </p>
                <div className="flex flex-col gap-1">
                  {recentQuestions.map((question) => (
                    <Button
                      key={question}
                      type="button"
                      variant="ghost"
                      className="h-auto justify-start px-2.5 py-1.5 text-left text-xs whitespace-normal"
                      onClick={() => void ask(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Try asking
              </p>
              <div className="flex flex-col gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="ghost"
                    className="h-auto justify-start px-2.5 py-2 text-left whitespace-normal"
                    onClick={() => void ask(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex max-h-[min(22rem,46vh)] flex-col gap-5 overflow-y-auto">
              {turns.map((turn, index) => (
                <div key={`${index}-${turn.question}`} className="flex flex-col gap-3">
                  <AnswerCard
                    question={turn.question}
                    answer={turn.answer}
                    pending={pending && index === turns.length - 1}
                  />
                  {pending && index === turns.length - 1 ? (
                    <div
                      aria-live="polite"
                      className="bg-muted text-muted-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                    >
                      <Search className="size-3.5 animate-pulse" />
                      {stage === "generating"
                        ? `Found ${turn.citations.length} source${turn.citations.length === 1 ? "" : "s"} · Generating answer…`
                        : `Searching ${selectedCourse?.code ?? "your materials"}…`}
                    </div>
                  ) : null}
                  {turn.citations.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Sources
                      </p>
                      {turn.citations.map((citation) => (
                        <CitationChip
                          key={`${index}-${citation.chunkId}`}
                          citation={citation}
                          onNavigate={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  ) : null}
                  {turn.answer ? (
                    <div className="flex flex-wrap gap-2">
                      {turn.citations[0] ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            router.push(citationHref(turn.citations[0]));
                          }}
                        >
                          <ExternalLink />
                          Open best source
                        </Button>
                      ) : null}
                      {containsDate(turn.answer) ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOpen(false);
                            router.push("/agenda");
                          }}
                        >
                          <CalendarDays />
                          View agenda
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {turn.followUps.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Ask next
                      </p>
                      {turn.followUps.map((question) => (
                        <Button
                          key={question}
                          type="button"
                          variant="ghost"
                          className="h-auto justify-start px-2.5 py-2 text-left whitespace-normal"
                          onClick={() => void ask(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {form}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground self-start text-xs"
                onClick={resetThread}
              >
                New question
                <kbd className="ml-1 font-mono">⌘⇧⌫</kbd>
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
