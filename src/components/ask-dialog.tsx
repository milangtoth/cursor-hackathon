"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
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

export function AskDialog() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function resetAsk() {
    abortRef.current?.abort();
    abortRef.current = null;
    setQuestion("");
    setPending(false);
    setAnswer(null);
    setCitations([]);
    setError(null);
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

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setQuestion(trimmed);
    setPending(true);
    setAnswer(null);
    setCitations([]);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Ask failed");
      }

      await readAskEvents(res, (event) => {
        if (event.type === "citations") {
          setCitations(event.citations);
        } else if (event.type === "answer") {
          setAnswer(event.answer);
          if (event.citations.length) setCitations(event.citations);
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

  const hasResults = pending || answer != null || citations.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetAsk();
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
            Answers are grounded in your course files, with a link to the page they came from.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(question);
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="When is my deadline for Databases?"
            autoFocus
          />
          <Button type="submit" disabled={pending || !question.trim()}>
            {pending ? "Asking…" : "Ask"}
          </Button>
        </form>
        {error ? (
          <p className="text-destructive text-sm">{friendlyAskError(error)}</p>
        ) : null}
        {!hasResults ? (
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
        ) : (
          <div className="flex max-h-[min(24rem,50vh)] flex-col gap-4 overflow-y-auto">
            {citations.length > 0 || answer != null ? (
              <>
                <AnswerCard answer={answer} pending={pending} />
                {citations.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Sources
                    </p>
                    {citations.map((citation) => (
                      <CitationChip
                        key={citation.chunkId}
                        citation={citation}
                        onNavigate={() => setOpen(false)}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Searching materials…</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
