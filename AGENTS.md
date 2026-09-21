<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ModernLMS

A hackathon LMS that fixes Moodle's slowness, plus an AI layer that acts on course material.
**Read `PLAN.md` first** — it holds the architecture, schedule, and scope decisions.

Time budget is 6 hours total. Bias every decision toward "works in the demo" over "correct in
general". Do not add abstractions for problems we do not have yet.

## Invariants — do not violate these without being asked

- **No database.** Data lives in `data/*.json`, hydrated into an in-memory store on boot,
  persisted on write. Do not add Prisma, Drizzle, Mongo, Redis, or a migration tool.
- **`src/lib/store.ts` is the only file that touches `data/` or the filesystem for domain data.**
  Everything else goes through it. This is what makes the "swap in Postgres later" story true.
- **`src/lib/gemini.ts` is the only file that calls the model API.** One place to swap providers.
- **PDF text extraction uses `unpdf` with `mergePages: false`.** Never `pdf-parse`. We need
  per-page text or citations are impossible.
- **Use the `@google/genai` SDK.** `@google/generative-ai` is deprecated; do not install it.
- **Embeddings are 768 dimensions and normalized at ingest time**, so similarity is a dot
  product. Never re-embed stored chunks at query time.
- **One ingest pipeline.** `src/lib/ingest.ts` is called by both `scripts/seed.ts` and
  `POST /api/materials`. Never duplicate parsing or chunking logic.
- **`src/lib/types.ts` is a shared contract between two people.** Extend it, but never rename or
  reshape an existing field without flagging it in your response.

## Conventions

- Server Components by default. Add `"use client"` only for interactivity, and push it to the
  leaf component rather than the page.
- Compose from `src/components/ui` (shadcn). Do not hand-roll a button, dialog, or input, and do
  not install another component library.
- Any model call that feeds the UI must use a `responseSchema` and be parsed with `zod`. Never
  regex prose out of a completion.
- Route handlers: validate input with `zod`, call `requireRole()` where the route is privileged,
  return typed JSON matching the contract in `PLAN.md`.
- Keep comments rare. Only write one to state a constraint the code cannot show.

## AI answer rules

- Retrieve top-k chunks, then pass them to the model **numbered**, instructing it to cite only
  the supplied ids. Drop any citation id that was not in the retrieved set before responding.
- Always include the course's deadline list in the prompt context. It is small and it makes
  date questions exact.
- If nothing clears the similarity floor, return "not found in your materials". Never let the
  model answer ungrounded.
- Log every question to `data/question-log.json`.

## Out of scope — say so confidently, do not build

OCR, real SSO, notifications, grading, mobile, multi-tenancy, tests, CI, deployment config.
Auth is intentionally a signed cookie over three seeded users; do not upgrade it to Auth.js.
