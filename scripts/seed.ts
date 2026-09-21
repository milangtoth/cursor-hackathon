import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import "./load-env";
import { ingestPdf } from "../src/lib/ingest";
import { newId, store } from "../src/lib/store";
import type { Chunk, Course, Deadline, Material, SourceCourse } from "../src/lib/types";

const LIVE_AI = process.env.SEED_LIVE_AI === "1";

function pageCountFor(materials: Material[], materialId: string): number {
  return materials.find((m) => m.id === materialId)?.pageCount ?? 1;
}

function pageForNeedle(
  chunks: Chunk[],
  materialId: string,
  needles: string[],
  fallbackPage: number
): number {
  const hay = chunks.filter((c) => c.materialId === materialId);
  for (const needle of needles) {
    const hit = hay.find((c) => c.text.includes(needle));
    if (hit) return hit.page;
  }
  return fallbackPage;
}

function curatedDeadline(
  courseId: string,
  title: string,
  dueAt: string,
  materialId: string,
  page: number
): Deadline {
  return {
    id: newId(),
    courseId,
    title,
    dueAt,
    source: { materialId, page },
  };
}

function attachCurated(materials: Material[], chunks: Chunk[]): {
  deadlines: Deadline[];
  summaries: Record<string, string>;
} {
  const page = (id: string, needles: string[]) =>
    pageForNeedle(chunks, id, needles, pageCountFor(materials, id));

  const deadlines: Deadline[] = [
    curatedDeadline(
      "cs101",
      "Assignment 1: Sorting visualiser",
      "2026-10-14T23:59:00.000Z",
      "mat-cs101-a1",
      page("mat-cs101-a1", ["14 October 2026"])
    ),
    curatedDeadline(
      "cs101",
      "Graph project checkpoint",
      "2026-11-28T23:59:00.000Z",
      "mat-cs101-graphs",
      page("mat-cs101-graphs", ["28 November 2026"])
    ),
    curatedDeadline(
      "cs101",
      "Final exam",
      "2026-12-12T09:00:00.000Z",
      "mat-cs101-syllabus",
      page("mat-cs101-syllabus", ["12 December 2026"])
    ),
    curatedDeadline(
      "db201",
      "Assignment 1: ER modelling",
      "2026-10-14T23:59:00.000Z",
      "mat-db201-er",
      page("mat-db201-er", ["14 October 2026"])
    ),
    curatedDeadline(
      "db201",
      "Midterm test",
      "2026-11-02T09:00:00.000Z",
      "mat-db201-syllabus",
      page("mat-db201-syllabus", ["2 November 2026"])
    ),
    curatedDeadline(
      "db201",
      "Normalisation mini-project",
      "2026-11-20T23:59:00.000Z",
      "mat-db201-norm",
      page("mat-db201-norm", ["20 November 2026"])
    ),
    curatedDeadline(
      "db201",
      "Final exam",
      "2026-12-15T09:00:00.000Z",
      "mat-db201-syllabus",
      page("mat-db201-syllabus", ["15 December 2026"])
    ),
    curatedDeadline(
      "pr12",
      "PI4 draft assignment",
      "2026-06-05T23:59:00.000Z",
      "mat-pr12-assignment",
      page("mat-pr12-assignment", ["5 June 2026"])
    ),
    curatedDeadline(
      "pr12",
      "PI4 final assignment",
      "2026-06-19T23:59:00.000Z",
      "mat-pr12-assignment",
      page("mat-pr12-assignment", ["19 June 2026"])
    ),
    curatedDeadline(
      "pr12",
      "PI4 resit",
      "2026-08-21T23:59:00.000Z",
      "mat-pr12-assignment",
      page("mat-pr12-assignment", ["21 August 2026"])
    ),
  ];

  const summaries: Record<string, string> = {
    "mat-cs101-syllabus":
      "CS101 Algorithms & Data Structures (Fall 2026, 7.5 ECTS) covers asymptotic analysis, sorting, trees, and graphs. Assessment is a sorting visualiser (20%), a graph project checkpoint (20%), and a closed-book final exam (60%) on 12 December 2026 at 09:00. If a later note disagrees with the dates in this table, the syllabus table wins.",
    "mat-cs101-sorting":
      "Week 3 lecture on insertion sort, mergesort, and quicksort: comparison counts, extra memory, and stability. Insertion sort is in-place and Θ(n²) in the worst case; mergesort is Θ(n log n) with a merge buffer and is stable. The visualiser assignment uses insertion sort and mergesort, not quicksort; count comparisons rather than swaps in the write-up.",
    "mat-cs101-a1":
      "Assignment 1 is a visualiser for insertion sort and mergesort on an array of bars, with play/pause/step controls and a live comparison counter. Submit source, a 60-second recording, and a one-page write-up before 23:59 on 14 October 2026. Pair work is allowed; late work loses 10% per day and is closed after three days.",
    "mat-cs101-graphs":
      "Week 6 lecture on graph representations (adjacency list vs matrix) and BFS, DFS, and Dijkstra. BFS is not Dijkstra with equal weights if you run BFS on a weighted graph. The graph project checkpoint is due 28 November 2026: working BFS and Dijkstra on the sample campus graph plus a screenshot, with no write-up yet.",
    "mat-db201-syllabus":
      "DB201 Introduction to Databases covers ER modelling, SQL, and normalisation, with PostgreSQL in the labs. Official dates: Assignment 1 (ER modelling) 14 October 2026, midterm 2 November 2026 at 09:00, normalisation mini-project 20 November 2026, and final exam 15 December 2026 at 09:00. Lab 3 is formative and required to sit the midterm but carries no percentage.",
    "mat-db201-sql":
      "Lecture on relational algebra operators (select, project, join, union) and how they map onto SQL SELECT. Read queries FROM/JOIN first, then WHERE, GROUP BY, HAVING, then SELECT. Primary keys, foreign keys, and NOT NULL are how the database refuses facts that cannot be true.",
    "mat-db201-er":
      "Assignment 1: design an ER diagram for a public library (members, copies, loans, child guardians) and a relational mapping. Submit a PDF of the diagram plus a one-page mapping table before 23:59 on 14 October 2026. Pair work is not allowed; late work loses 10% per day and the assignment closes after three days.",
    "mat-db201-norm":
      "Week 6 notes walk a denormalised LoanSheet into 1NF, 2NF, and 3NF so titles live on Book rather than on every loan. The normalisation mini-project (events.csv to 3NF, a short anomalies note, and CREATE TABLE SQL) is due 20 November 2026 and is individual work.",
    "mat-pr12-overview":
      "PR12 Calculus (ADSAI, Zuyd, block 4 2025–2026) runs weeks 1–7: limits and derivatives, differentiation techniques, Taylor/optimization, indefinite integrals, definite integrals and DEs, multivariable functions and partials, then multivariable optimization. Each week has a lecture PDF and a GD sheet. Graded PI4 work: draft due 5 June 2026, final due 19 June 2026, resit due 21 August 2026.",
    "mat-pr12-assignment":
      "Hand in PI4 calculus as a PDF. Draft due 5 June 2026 at 23:59, final due 19 June 2026 at 23:59, resit due 21 August 2026 at 23:59. The draft is formative; the final is graded. Use the mock exam in Assessment before you submit.",
  };

  return { deadlines, summaries };
}

async function main() {
  const contentRoot = join(process.cwd(), "content");
  const pdfDir = join(process.cwd(), "public", "content");
  const dirs = readdirSync(contentRoot, { withFileTypes: true }).filter((d) => d.isDirectory());

  const courses: Course[] = [];
  const materials: Material[] = [];
  const chunks: Chunk[] = [];
  let deadlines: Deadline[] = [];
  let summaries: Record<string, string> = {};

  for (const dirent of dirs) {
    const dir = join(contentRoot, dirent.name);
    const source = JSON.parse(readFileSync(join(dir, "course.json"), "utf8")) as SourceCourse;
    const course: Course = {
      id: source.id,
      code: source.code,
      title: source.title,
      teacherId: source.teacherId,
      year: source.year,
      semester: source.semester,
      block: source.block,
      heroImage: source.heroImage,
      modules: source.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        order: mod.order,
        materialIds: mod.materials.map((m) => m.id),
      })),
    };
    courses.push(course);

    for (const mod of source.modules) {
      for (const mat of mod.materials) {
        const pdfPath = join(pdfDir, mat.fileName);
        if (!existsSync(pdfPath)) {
          throw new Error(`missing ${mat.fileName} — run npm run pdfs first`);
        }
        const buf = readFileSync(pdfPath);
        console.log(`seed: ingest ${mat.fileName}`);
        const extractDeadlines = LIVE_AI ? (mat.skipDeadlineExtract ? false : true) : false;
        const extractSummary = LIVE_AI ? (mat.skipSummary ? false : true) : false;
        const result = await ingestPdf(buf, {
          courseId: source.id,
          moduleId: mod.id,
          materialId: mat.id,
          title: mat.title,
          fileName: mat.fileName,
          kind: mat.kind,
          published: mat.published ?? true,
          extractDeadlines,
          extractSummary,
        });
        materials.push(result.material);
        chunks.push(...result.chunks);
        if (LIVE_AI) {
          deadlines.push(...result.deadlines);
          if (result.summary) summaries[result.material.id] = result.summary;
        }
        console.log(
          `  pages=${result.material.pageCount} chunks=${result.chunks.length} deadlines=${result.deadlines.length} summary=${result.summary ? "yes" : "no"}`
        );
      }
    }
  }

  if (!LIVE_AI) {
    const curated = attachCurated(materials, chunks);
    deadlines = curated.deadlines;
    summaries = curated.summaries;
    console.log("seed: attached curated deadlines and summaries (SEED_LIVE_AI unset)");
  }

  store.replaceAll({
    users: store.users(),
    courses,
    materials,
    chunks,
    deadlines,
    summaries,
    questionLog: store.questionLog(),
    submissions: store.submissions(),
  });

  console.log(
    `seed: wrote ${materials.length} materials, ${chunks.length} chunks, ${deadlines.length} deadlines, ${Object.keys(summaries).length} summaries`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
