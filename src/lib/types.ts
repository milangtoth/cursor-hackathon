export type Role = "student" | "teacher" | "admin";

export interface User {
  id: string;
  name: string;
  role: Role;
  courseIds: string[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  teacherId: string;
  heroImage?: string;
  modules: Module[];
}

export interface Module {
  id: string;
  title: string;
  order: number;
  materialIds: string[];
}

export interface Material {
  id: string;
  courseId: string;
  moduleId: string;
  kind: "pdf" | "assignment";
  title: string;
  fileName: string;
  pageCount: number;
  uploadedAt: string;
  published: boolean;
}

export interface Chunk {
  id: string;
  courseId: string;
  materialId: string;
  page: number;
  text: string;
  embedding: number[];
}

export interface Deadline {
  id: string;
  courseId: string;
  title: string;
  dueAt: string;
  source: { materialId: string; page: number } | { manual: true };
}

export interface Citation {
  chunkId: string;
  materialId: string;
  materialTitle: string;
  page: number;
  snippet: string;
  courseId: string;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
}

export interface QuestionLogEntry {
  id: string;
  userId: string;
  courseId?: string;
  question: string;
  askedAt: string;
  citationCount: number;
}

export interface IngestMeta {
  courseId: string;
  moduleId: string;
  materialId?: string;
  title: string;
  fileName: string;
  kind: "pdf" | "assignment";
  published?: boolean;
  extractDeadlines?: boolean;
  extractSummary?: boolean;
}

export interface IngestResult {
  material: Material;
  chunks: Chunk[];
  deadlines: Deadline[];
  summary: string | null;
}

export interface SourceMaterial {
  id: string;
  file: string;
  title: string;
  kind: "pdf" | "assignment";
  skipDeadlineExtract?: boolean;
  skipSummary?: boolean;
}

export interface SourceCourse {
  id: string;
  code: string;
  title: string;
  teacherId: string;
  heroImage?: string;
  modules: {
    id: string;
    title: string;
    order: number;
    materials: SourceMaterial[];
  }[];
}
