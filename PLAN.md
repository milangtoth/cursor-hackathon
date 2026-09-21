# ModernLMS — 6 Hour Build Plan

A modern LMS that fixes what students hate about Moodle: slow, outdated, full page reload on
every click. Our angle is a fast SPA-feel app plus an AI layer that *does things* with the
course material instead of just chatting about it.

Team of 2 (referred to below as **A** and **B**). Judged on a live demo.

---

## 1. The demo we are building toward

Write this down and protect it. Every scope decision is judged against whether it serves this
90 second path.

1. Log in as **student**. Click through course to module to material. Nothing reloads, nothing
   flickers, sidebar stays put. "This is the part Moodle can't do."
2. Hit `Cmd+K`, ask *"when is my deadline for Databases?"*. Citation cards appear almost
   instantly, then the answer resolves above them. Click a citation, land on the exact page of
   the exact PDF, matched passage highlighted.
3. Open a lecture PDF, click **Summarize**. Instant.
4. Open **Agenda**. Every deadline was extracted from the material by AI, and every item links
   back to the file and page it came from.
5. Log out, log in as **teacher**. Upload a brand new assignment PDF. The UI shows the real
   pipeline: parsing pages, chunking, embedding, indexing.
6. Switch back to **student**. Ask about the document uploaded 30 seconds ago. Correct answer,
   correct citation, and the new deadline is already in the agenda.

Step 5 to 6 is the money shot. Guard the time needed for it.

---

## 2. Architecture decisions

### No database service

Data lives in JSON on disk, hydrated into an in-memory store when the server boots, and
persisted back to disk on every write. Retrieval is a loop over a few hundred vectors, which is
sub-millisecond. No schema, no migrations, no client setup, no service to babysit.

If a judge asks "where is your database?", the honest answer is:
*"Postgres with pgvector, hosted in the EU. Every read and write goes through one repository
module (`src/lib/store.ts`), so it's a contained swap. For the demo we keep the index in memory
so nothing you see is hidden behind a loading spinner."*

If we finish early, actually do it: Neon + Drizzle + pgvector, roughly 45 minutes. Not before.

No MongoDB (buys nothing here). No Redis (nothing to cache that isn't already in memory).

### Everything runs on localhost for the demo

Uploads write to the filesystem, which rules out serverless hosting without changes. Deploying
is a post-freeze stretch goal, not a dependency. Demo from a **production build**
(`npm run build && npm start`) — dev mode's compile-on-navigate will make our
"fast navigation" pitch look like a lie.

### Auth is deliberately demo grade

A login page listing three seeded users. Click one, we set a signed httpOnly cookie, middleware
guards the routes, server actions check the role. About 40 minutes. Auth.js with a real
credentials provider is the documented swap and we say so out loud rather than pretending this
is production auth.

### One ingestion pipeline, two callers

`src/lib/ingest.ts` is a library: `ingestPdf(buffer, meta)` returns chunks with page numbers,
embeddings, and extracted deadlines. It is called by `scripts/seed.ts` at build time and by
`POST /api/materials` at runtime. Write it once, use it twice.

### Stack

| Concern | Choice | Why this one |
| --- | --- | --- |
| App | Next.js 15 App Router + TypeScript | Soft client-side nav via `<Link>` is free |
| Styling | Tailwind + shadcn/ui | Fastest path to something that looks deliberate |
| PDF text | `unpdf` | `extractText(buf, { mergePages: false })` returns **an array of pages**, so page-accurate citations are free. `pdf-parse` returns one blob and then citations are impossible. |
| LLM | `@google/genai`, Gemini Flash | The older `@google/generative-ai` package is deprecated |
| Embeddings | `gemini-embedding-001` at **768 dims** | Small JSON, and normalize at ingest so cosine is a dot product |
| Validation | `zod` | Also feeds the Gemini `responseSchema` |
| PDF authoring | `puppeteer` via a script | Course content stays editable as markdown |

Use structured output (`responseSchema`) for anything that feeds the UI: answers, deadline
extraction, summaries. Parsing prose out of a model response at 2am is how demos die.

---

## 3. Folder structure

```
content/                          # hand-authored source material, editable as markdown
  cs101-algorithms/
    course.json                   # title, code, teacherId, modules[] -> material files
    01-syllabus.md
    03-assignment-1.md
data/                             # JSON store. Seeded by script, mutated at runtime.
  users.json
  courses.json
  materials.json
  chunks.json                     # {id, materialId, page, text, embedding[768]}
  deadlines.json
  summaries.json
  question-log.json               # every AI question, powers the teacher insight panel
uploads/                          # runtime-uploaded PDFs (gitignored)
public/content/                   # seeded PDFs, served to the viewer
scripts/
  make-pdfs.ts                    # markdown -> PDF via puppeteer
  seed.ts                         # calls lib/ingest for every seeded file
src/
  middleware.ts                   # cookie check + role gate on /teacher and /admin
  app/
    login/page.tsx
    layout.tsx                    # app shell: sidebar, topbar, Cmd+K. Persists across nav.
    page.tsx                      # student dashboard: courses + next 7 days
    courses/[courseId]/layout.tsx # module tree sidebar — keeps content pane the only re-render
    courses/[courseId]/page.tsx
    courses/[courseId]/[materialId]/page.tsx
    agenda/page.tsx
    teacher/page.tsx              # course list
    teacher/[courseId]/page.tsx   # materials, upload, publish toggle, assignment form
    admin/page.tsx                # users + courses, read-only
    api/
      auth/login/route.ts
      auth/logout/route.ts
      ask/route.ts
      summarize/route.ts
      materials/route.ts          # POST upload, DELETE remove
      assignments/route.ts
      extract-deadlines/route.ts
  components/
    ask-dialog.tsx  answer-card.tsx  citation-chip.tsx
    material-viewer.tsx  summary-panel.tsx  agenda-list.tsx
    upload-dropzone.tsx  pipeline-status.tsx  role-badge.tsx
    ui/                           # shadcn
  lib/
    types.ts                      # WRITE THIS FIRST. Shared contract.
    store.ts                      # the only file that touches data/
    auth.ts                       # session cookie, getCurrentUser, requireRole
    gemini.ts                     # every model call, one place to swap providers
    ingest.ts                     # pdf -> pages -> chunks -> embeddings -> deadlines
    retrieve.ts                   # embed query -> cosine -> top-k
```

### In-memory store gotcha

Next.js reloads modules, which will silently throw away module-level state. Hang the store off
`globalThis`:

```ts
const g = globalThis as unknown as { __lmsStore?: Store };
export const store = (g.__lmsStore ??= loadFromDisk());
```

Persist to disk on every write so a restart mid-demo is survivable.

---

## 4. Shared contract — write this before anything else

Commit `src/lib/types.ts` and fixture JSON in the first 25 minutes. After that both of us work
against the same shapes and never block each other.

```ts
export type Role = "student" | "teacher" | "admin";

export interface User { id: string; name: string; role: Role; courseIds: string[] }

export interface Course { id: string; code: string; title: string; teacherId: string; modules: Module[] }
export interface Module { id: string; title: string; order: number; materialIds: string[] }

export interface Material {
  id: string; courseId: string; moduleId: string;
  kind: "pdf" | "assignment";
  title: string; fileName: string; pageCount: number;
  uploadedAt: string; published: boolean;
}

export interface Chunk {
  id: string; courseId: string; materialId: string;
  page: number; text: string;
  embedding: number[];              // 768 dims, pre-normalized
}

export interface Deadline {
  id: string; courseId: string; title: string;
  dueAt: string;                    // ISO
  source: { materialId: string; page: number } | { manual: true };
}

export interface Citation {
  chunkId: string; materialId: string; materialTitle: string;
  page: number; snippet: string;
}

export interface AskResponse { answer: string; citations: Citation[] }
```

API contract:

- `POST /api/auth/login` `{ userId }` sets the session cookie
- `POST /api/ask` `{ question, courseId? }` returns `AskResponse`
- `POST /api/summarize` `{ materialId, force? }` returns `{ summary, cached }`
- `POST /api/materials` FormData `{ file, courseId, moduleId, title }` returns
  `{ material, chunksAdded, deadlinesFound }`
- `POST /api/assignments` `{ courseId, title, dueAt }` returns `Deadline`
- `POST /api/extract-deadlines` `{ materialId }` returns `Deadline[]`

---

## 5. Features: the minimum that still demos well

### Fast navigation
Nothing to build beyond the route structure. Data is in memory so server components render in
single-digit milliseconds. Add a `loading.tsx` skeleton per route and let `<Link>` prefetch.
Never call `window.location` and never use a form post that reloads.

### Seeded courses
**2 courses, 4 to 5 documents each.** Author them as markdown and convert to PDF with a script
so content stays editable in seconds. Have an LLM draft the prose.

Deliberately vary where the deadlines hide, because that variety is what sells the planner:
one as a table in a syllabus, one as a sentence in an assignment brief ("submit before 23:59 on
14 October"), one buried in week-6 lecture notes.

### AI search with citations
Query to embedding, cosine top-6 chunks, one Gemini call with the chunks numbered and the
instruction to cite only from the supplied ids. Two details carry this feature:

- **Render the citation cards before the answer arrives.** Retrieval is instant; the answer
  text fills in above them a second later. This buys us streaming's perceived speed for none of
  streaming's work.
- **Always append that course's deadline list to the prompt context.** It's tiny, and it makes
  "when is my deadline for X" exactly right every time, instead of hoping vector search happens
  to surface a date inside a table. Skip function calling; no time, and this is better.

Validate citations server-side and drop any id the model invented. Low temperature. If nothing
is retrieved above a similarity floor, say "not found in your materials" rather than guessing.
Log every question to `question-log.json` — it costs one line and powers the teacher panel.

### Summarize
Pre-bake every seeded summary at seed time so the panel opens instantly. Keep a **Regenerate**
button that calls the API live, so it is provably real when a judge asks.

### Planner
Deadlines are extracted at seed time with structured output and eyeballed by us once, so the
agenda is always correct on stage. Each item links back to its source file and page, which is
what makes it feel trustworthy instead of magical. Checkbox state goes in `localStorage`.

Leave **one** seeded material un-extracted, with an "Extract tasks from this document" button
that runs live in about two seconds. That click is the proof that the AI acts on material.

### Auth and roles
Login page lists three seeded users (student, teacher, admin) as clickable cards. Signed
httpOnly cookie, `middleware.ts` gates `/teacher` and `/admin`, `requireRole()` guards server
actions and route handlers. Role-aware nav. A user switcher in the topbar so the demo can hop
accounts without typing.

### Teacher console
- Material list for the course with a publish toggle and delete.
- **Upload dropzone.** `POST /api/materials`, which calls the same `ingest` library as the seed
  script. Show the real pipeline steps as they complete: parsing 4 pages, chunking, embedding,
  indexing, 2 deadlines found. Four lines of UI that make invisible AI work visible.
- Assignment form: title plus due date, writes a `Deadline` with `source: { manual: true }`.
  Instantly visible in the student's agenda, which makes the role split concrete.
- If time allows: "what students are asking", read straight from `question-log.json`. Cheap and
  it lands well with judges.

### Admin
Read-only table of users and courses with role badges. Twenty minutes. First thing to cut.

---

## 6. Schedule

Aggressive but doable. **Feature freeze at 4:00** is not negotiable.

| Time | A (data + AI + server) | B (UI + client) |
| --- | --- | --- |
| 0:00–0:25 | Both: scaffold, shadcn init, `types.ts`, fixture JSON, Gemini key smoke test | |
| 0:25–1:25 | `ingest.ts` + `store.ts` + `make-pdfs` + `seed.ts` | App shell, dashboard, course layout, material viewer, all on fixtures |
| 1:25–2:10 | `auth.ts`, middleware, login route, `requireRole` | Login page, role-aware nav, user switcher, topbar |
| 2:10–3:10 | `retrieve.ts` + `/api/ask` with grounded answers and deadline context | `Cmd+K` ask dialog, answer card, citation chips, deep link + highlight |
| 3:10–4:00 | `/api/materials` upload, `/api/assignments`, `/api/summarize` | Teacher console: material list, upload dropzone, pipeline status, assignment form, agenda view, summary panel |
| 4:00–4:30 | Both: fixtures out, real data in, fix breakage. **FREEZE.** | |
| 4:30–5:15 | Both: polish. Skeletons, empty states, one accent color, focus states, fix the three worst bugs. | |
| 5:15–5:45 | Both: rehearse the section 1 path twice. Record a 90 second backup video. | |
| 5:45–6:00 | Buffer. There is always something. | |

Also author the course content during any block where you are blocked — it parallelizes with
everything.

---

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Scope creep | Freeze at 4:00. New ideas go on a "what's next" slide, not into the repo. |
| AI latency | Pre-baked summaries and deadlines; citations render before the answer; cap `maxOutputTokens` and demand 4 sentences max. |
| PDF parsing edge cases | Seeded PDFs are generated by us from markdown, so they always parse. Upload path validates `pageCount > 0` and fails with a readable message instead of a stack trace. |
| Upload of a scanned/image PDF mid-demo | Use our own prepared file for the live upload. Detect zero extracted text and show "no text layer found, OCR is on the roadmap". |
| Hallucinated citations | Model may only cite supplied chunk ids; strip unknown ids server-side; similarity floor; low temperature. |
| Venue wifi or rate limits | Cache every model response to disk keyed by prompt hash, plus a `DEMO_MODE=offline` flag that serves cache only. Backup video as the floor. |
| In-memory state lost on reload | `globalThis` singleton, and persist to disk on every write. |
| "Is this real auth?" | Answer honestly: signed cookie sessions with role gating, swappable for Auth.js or the university's SSO. Don't oversell it. |
| GDPR question | Materials stay in the institution's storage. Embeddings computed server-side in the EU. No PII in prompts. Paid API tier, so no training on our data. Role-based access control already enforced. Every AI answer is citation-grounded, so it is auditable rather than a black box. DPA and a retention policy on the roadmap. |
| Vendor lock-in question | Every model call lives in `lib/gemini.ts`. One file to swap. |
| Crash on stage | Two browser tabs already parked on the key screens, video ready in a third. |

---

## 8. If behind schedule, cut in this order

1. Admin page.
2. Teacher "what students are asking" panel.
3. Teacher publish toggle and delete (upload only).
4. `Cmd+K` palette becomes a plain search input on the dashboard.
5. Teacher assignment form (deadlines come only from AI extraction).
6. Live "Regenerate summary" — pre-baked summaries only.
7. Live "Extract tasks" button — pre-baked deadlines only.
8. In-app PDF rendering becomes extracted page text with the matched passage highlighted plus a
   link to the raw file. Honestly almost as good, and far cheaper.
9. Separate agenda page becomes an "upcoming" card on the dashboard.
10. Two courses becomes one course, done deeply.

**Never cut:** the soft-navigation feel, ask-with-real-citations, and the upload-then-ask loop.
Those three *are* the pitch.

---

## 9. Setup

```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npx shadcn@latest init
npm i @google/genai unpdf zod
npm i -D tsx puppeteer @types/node
```

`.env.local`:

```
GEMINI_API_KEY=
SESSION_SECRET=
DEMO_MODE=live          # set to "offline" to serve only cached model responses
```

Scripts in `package.json`:

```
"pdfs":  "tsx scripts/make-pdfs.ts",
"seed":  "tsx scripts/seed.ts",
"demo":  "next build && next start"
```

Gitignore `uploads/` but **commit `data/`** so both of us and the demo laptop start from the
same seeded state.

---

## 10. Working agreement

- `src/lib/types.ts` is the contract. Change it only by telling the other person out loud.
- A owns everything under `src/lib` and `src/app/api`. B owns `src/components` and pages.
  Where they meet, B writes against fixtures until A's endpoint lands.
- Commit small and push often. Never leave the shared branch broken at a time boundary.
- Out of scope, and say so confidently if asked: OCR, real SSO, notifications, grading, mobile
  app, multi-tenancy, offline mode.
