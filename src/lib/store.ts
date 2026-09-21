import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Chunk,
  Course,
  Deadline,
  Material,
  QuestionLogEntry,
  User,
} from "./types";

export type StoreData = {
  users: User[];
  courses: Course[];
  materials: Material[];
  chunks: Chunk[];
  deadlines: Deadline[];
  summaries: Record<string, string>;
  questionLog: QuestionLogEntry[];
};

const DATA_DIR = join(process.cwd(), "data");

const FILES = {
  users: "users.json",
  courses: "courses.json",
  materials: "materials.json",
  chunks: "chunks.json",
  deadlines: "deadlines.json",
  summaries: "summaries.json",
  questionLog: "question-log.json",
} as const;

function readJson<T>(file: string, fallback: T): T {
  const path = join(DATA_DIR, file);
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(file: string, value: unknown) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(join(DATA_DIR, file), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function loadFromDisk(): StoreData {
  return {
    users: readJson(FILES.users, []),
    courses: readJson(FILES.courses, []),
    materials: readJson(FILES.materials, []),
    chunks: readJson(FILES.chunks, []),
    deadlines: readJson(FILES.deadlines, []),
    summaries: readJson(FILES.summaries, {}),
    questionLog: readJson(FILES.questionLog, []),
  };
}

function persist(data: StoreData, keys: (keyof typeof FILES)[] = Object.keys(FILES) as (keyof typeof FILES)[]) {
  for (const key of keys) {
    writeJson(FILES[key], data[key]);
  }
}

export class Store {
  constructor(private data: StoreData) {}

  users() {
    return this.data.users;
  }
  user(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  courses() {
    return this.data.courses;
  }
  course(id: string) {
    return this.data.courses.find((c) => c.id === id);
  }
  coursesForUser(user: User) {
    if (user.role === "admin") return this.data.courses;
    return this.data.courses.filter((c) => user.courseIds.includes(c.id));
  }

  materials() {
    return this.data.materials;
  }
  material(id: string) {
    return this.data.materials.find((m) => m.id === id);
  }
  materialsByCourse(courseId: string) {
    return this.data.materials.filter((m) => m.courseId === courseId);
  }

  chunks() {
    return this.data.chunks;
  }
  chunk(id: string) {
    return this.data.chunks.find((c) => c.id === id);
  }
  chunksByCourse(courseId: string) {
    return this.data.chunks.filter((c) => c.courseId === courseId);
  }
  chunksByMaterial(materialId: string) {
    return this.data.chunks.filter((c) => c.materialId === materialId);
  }

  deadlines() {
    return this.data.deadlines;
  }
  deadlinesByCourse(courseId: string) {
    return this.data.deadlines.filter((d) => d.courseId === courseId);
  }
  deadlinesByMaterial(materialId: string) {
    return this.data.deadlines.filter(
      (d) => !("manual" in d.source) && d.source.materialId === materialId
    );
  }

  summary(materialId: string) {
    return this.data.summaries[materialId] ?? null;
  }
  setSummary(materialId: string, summary: string) {
    this.data.summaries[materialId] = summary;
    persist(this.data, ["summaries"]);
  }

  questionLog() {
    return this.data.questionLog;
  }
  logQuestion(entry: Omit<QuestionLogEntry, "id" | "askedAt"> & { id?: string; askedAt?: string }) {
    const full: QuestionLogEntry = {
      id: entry.id ?? randomUUID(),
      userId: entry.userId,
      courseId: entry.courseId,
      question: entry.question,
      askedAt: entry.askedAt ?? new Date().toISOString(),
      citationCount: entry.citationCount,
    };
    this.data.questionLog.push(full);
    persist(this.data, ["questionLog"]);
    return full;
  }

  upsertMaterial(material: Material) {
    const idx = this.data.materials.findIndex((m) => m.id === material.id);
    if (idx === -1) this.data.materials.push(material);
    else this.data.materials[idx] = material;
    this.attachMaterialToModule(material);
    persist(this.data, ["materials", "courses"]);
  }

  replaceChunksForMaterial(materialId: string, chunks: Chunk[]) {
    this.data.chunks = this.data.chunks.filter((c) => c.materialId !== materialId);
    this.data.chunks.push(...chunks);
    persist(this.data, ["chunks"]);
  }

  saveChunks(chunks: Chunk[]) {
    this.data.chunks = chunks;
    persist(this.data, ["chunks"]);
  }

  addDeadlines(deadlines: Deadline[]) {
    this.data.deadlines.push(...deadlines);
    persist(this.data, ["deadlines"]);
  }

  replaceDeadlinesForMaterial(materialId: string, deadlines: Deadline[]) {
    this.data.deadlines = this.data.deadlines.filter(
      (d) => "manual" in d.source || d.source.materialId !== materialId
    );
    this.data.deadlines.push(...deadlines);
    persist(this.data, ["deadlines"]);
  }

  deleteMaterial(materialId: string) {
    this.data.materials = this.data.materials.filter((m) => m.id !== materialId);
    this.data.chunks = this.data.chunks.filter((c) => c.materialId !== materialId);
    delete this.data.summaries[materialId];
    this.data.deadlines = this.data.deadlines.filter(
      (d) => "manual" in d.source || d.source.materialId !== materialId
    );
    for (const course of this.data.courses) {
      for (const mod of course.modules) {
        mod.materialIds = mod.materialIds.filter((id) => id !== materialId);
      }
    }
    persist(this.data, ["materials", "chunks", "summaries", "deadlines", "courses"]);
  }

  replaceAll(data: StoreData) {
    this.data = data;
    persist(this.data);
  }

  snapshot(): StoreData {
    return this.data;
  }

  private attachMaterialToModule(material: Material) {
    const course = this.data.courses.find((c) => c.id === material.courseId);
    if (!course) return;
    const mod = course.modules.find((m) => m.id === material.moduleId);
    if (!mod) return;
    if (!mod.materialIds.includes(material.id)) mod.materialIds.push(material.id);
  }
}

const g = globalThis as unknown as { __lmsStore?: Store };
export const store = (g.__lmsStore ??= new Store(loadFromDisk()));

export function newId() {
  return randomUUID();
}

export function publicPdfPath(fileName: string) {
  return `/content/${fileName}`;
}
