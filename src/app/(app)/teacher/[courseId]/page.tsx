import { notFound, redirect } from "next/navigation";
import { AssignmentForm } from "@/components/assignment-form";
import { requireDemoUser } from "@/components/demo-session";
import { TeacherMaterialList } from "@/components/teacher-material-list";
import { UploadDropzone } from "@/components/upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const materials = store.materialsByCourse(course.id);
  const deadlines = store.deadlinesByCourse(course.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <p className="text-muted-foreground text-sm font-medium">{course.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload a PDF to run the live ingest pipeline, then ask as a student.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone courseId={course.id} modules={course.modules} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manual assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentForm courseId={course.id} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherMaterialList
            courseId={course.id}
            materials={materials}
            deadlines={deadlines}
          />
        </CardContent>
      </Card>
    </div>
  );
}
