import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AssignmentForm } from "@/components/assignment-form";
import { courseTermLabel } from "@/components/course-term";
import { formatDueAt } from "@/components/due-date";
import { requireDemoUser } from "@/components/demo-session";
import { TeacherMaterialList } from "@/components/teacher-material-list";
import { UploadDropzone } from "@/components/upload-dropzone";
import { store } from "@/lib/store";

export default async function TeacherCoursePage({
  params,
}: PageProps<"/teacher/[courseId]">) {
  const user = await requireDemoUser();
  if (user.role !== "teacher" && user.role !== "admin") redirect("/");
  const { courseId } = await params;
  const course = store.course(courseId);
  if (!course) notFound();
  if (user.role !== "admin" && !user.courseIds.includes(course.id)) notFound();

  const modules = [...course.modules].sort((a, b) => a.order - b.order);
  const materials = store.materialsByCourse(course.id);
  const deadlines = store.deadlinesByCourse(course.id);
  const submissions = store.submissionsByCourse(course.id);
  const assignments = materials.filter((material) => material.kind === "assignment");
  const questions = store
    .questionLog()
    .filter((entry) => entry.courseId === course.id)
    .slice(-8)
    .reverse();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 overflow-y-auto p-6">
      <div>
        <p className="text-muted-foreground text-sm font-medium">
          <Link href="/teacher" prefetch className="hover:text-foreground">
            All courses
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {course.code}{" "}
          <span className="text-muted-foreground font-normal">{course.title}</span>
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {courseTermLabel(course)}
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
        <div>
          <h2 className="text-sm font-medium">Upload</h2>
          <p className="text-muted-foreground text-sm">
            Parsing, chunking, embedding, and indexing run on the file you add.
          </p>
        </div>
        <UploadDropzone courseId={course.id} modules={modules} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Materials</h2>
        <TeacherMaterialList
          modules={modules}
          materials={materials}
          deadlines={deadlines}
        />
      </section>

      {assignments.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Hand-ins</h2>
          <ul className="flex flex-col gap-4">
            {assignments.map((assignment) => {
              const rows = submissions.filter(
                (entry) => entry.materialId === assignment.id,
              );
              return (
                <li key={assignment.id} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{assignment.title}</p>
                  {rows.length === 0 ? (
                    <p className="text-muted-foreground text-sm">None yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {rows.map((entry) => {
                        const who = store.user(entry.userId);
                        return (
                          <li
                            key={entry.id}
                            className="flex items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                          >
                            <span>
                              <span className="font-medium">
                                {who?.name ?? "Student"}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                · {entry.originalName}
                              </span>
                            </span>
                            <time
                              dateTime={entry.submittedAt}
                              className="text-muted-foreground shrink-0 text-xs"
                            >
                              {formatDueAt(entry.submittedAt)}
                            </time>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Add a deadline</h2>
          <p className="text-muted-foreground text-sm">
            Shows up on the student agenda immediately.
          </p>
          <AssignmentForm courseId={course.id} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">What students are asking</h2>
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nothing yet. Questions appear here after a student uses Ask.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {questions.map((entry) => {
                const who = store.user(entry.userId);
                return (
                  <li
                    key={entry.id}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <p>{entry.question}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {who?.name ?? "Student"}
                      {entry.citationCount
                        ? ` · ${entry.citationCount} source${entry.citationCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
