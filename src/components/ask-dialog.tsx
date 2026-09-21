"use client";

import { useEffect, useRef, useState } from "react";
import { Calculator, Search } from "lucide-react";
import { AnswerCard } from "@/components/answer-card";
import { CitationChip } from "@/components/citation-chip";
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
import type { Citation } from "@/lib/types";

const SUGGESTIONS = [
  "When is my deadline for Databases?",
  "What is Assignment 1 in Algorithms?",
  "When is the DB201 midterm?",
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
  | { type: "answer"; answer: string; citations: Citation[] }
  | { type: "error"; error: string };

type Turn = {
  question: string;
  answer: string | null;
  citations: Citation[];
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

export function AskDialog() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetThread() {
    abortRef.current?.abort();
    abortRef.current = null;
    setTurns([]);
    setDraft("");
    setError(null);
    setPending(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open && !pending) inputRef.current?.focus();
  }, [open, pending, turns.length]);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;

    if (tryCalc(trimmed) != null) {
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
      .map((turn) => ({ question: turn.question, answer: turn.answer! }));

    setDraft("");
    setPending(true);
    setError(null);
    setTurns((prev) => [
      ...prev.filter((turn) => turn.answer != null),
      { question: trimmed, answer: null, citations: [] },
    ]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Ask failed");
      }

      await readAskEvents(res, (event) => {
        if (event.type === "citations") {
          setTurns((prev) => patchLastTurn(prev, { citations: event.citations }));
        } else if (event.type === "answer") {
          setTurns((prev) =>
            patchLastTurn(prev, {
              answer: event.answer,
              citations: event.citations.length
                ? event.citations
                : prev[prev.length - 1]?.citations ?? [],
            })
          );
        } else if (event.type === "error") {
          setError(event.error);
        }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      if (abortRef.current === ac) setPending(false);
    }
  }

  const calc = tryCalc(draft);
  const hasResults = pending || turns.length > 0;
  const followUp = turns.some((turn) => turn.answer);

  const form = (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void ask(draft);
      }}
    >
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={
          followUp ? "Ask a follow-up…" : "Ask, or type 12*8"
        }
        autoFocus
      />
      <Button type="submit" disabled={pending || !draft.trim()}>
        {pending ? "Asking…" : followUp ? "Follow up" : "Ask"}
      </Button>
    </form>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetThread();
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
            Course answers with citations — or type 12*8 like Spotlight.
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
                  ) : pending && index === turns.length - 1 ? (
                    <p className="text-muted-foreground text-sm">
                      Searching materials…
                    </p>
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
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
