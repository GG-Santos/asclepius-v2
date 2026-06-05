import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createModule,
  deleteCourse,
  deleteLesson,
  deleteModule,
  updateCourse,
} from "@/app/dashboard/courses/actions";
import { CourseForm } from "@/components/dashboard/course-form";
import { LessonDialog } from "@/components/dashboard/lesson-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course) notFound();

  const lessonCount = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/courses"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Courses
        </Link>
        {course.status === "PUBLISHED" && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/portal/courses/${course.slug}`} target="_blank">
              <ExternalLink aria-hidden /> View in portal
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-on-surface">{course.title}</h1>
        <Badge variant={course.status === "PUBLISHED" ? "verified" : "neutral"}>
          {course.status === "PUBLISHED" ? "Published" : "Draft"}
        </Badge>
      </div>

      <CourseForm
        action={updateCourse.bind(null, course.id)}
        submitLabel="Save course"
        showSuccessToast
        defaults={{
          title: course.title,
          slug: course.slug,
          summary: course.summary ?? undefined,
          coverImage: course.coverImage ?? undefined,
          status: course.status,
        }}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Curriculum</h2>
          <p className="text-sm text-on-surface-variant">
            {course.modules.length} module
            {course.modules.length === 1 ? "" : "s"} · {lessonCount} lesson
            {lessonCount === 1 ? "" : "s"}
          </p>
        </div>

        {course.modules.map((module) => (
          <Card key={module.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-on-surface">
                  {module.title}
                </h3>
                <form action={deleteModule}>
                  <input type="hidden" name="id" value={module.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <button
                    type="submit"
                    title="Delete module"
                    className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </form>
              </div>

              <ul className="divide-y divide-outline-variant/40 rounded border border-outline-variant/40">
                {module.lessons.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-on-surface-variant">
                    No lessons yet.
                  </li>
                ) : (
                  module.lessons.map((lesson, i) => (
                    <li
                      key={lesson.id}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
                        <span className="text-on-surface-variant tabular-nums">
                          {i + 1}.
                        </span>
                        <span className="truncate">{lesson.title}</span>
                        {lesson.durationMins ? (
                          <span className="shrink-0 text-xs text-on-surface-variant">
                            {lesson.durationMins} min
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-1">
                        <LessonDialog
                          courseId={course.id}
                          moduleId={module.id}
                          lesson={{
                            id: lesson.id,
                            title: lesson.title,
                            content: lesson.content,
                            durationMins: lesson.durationMins,
                          }}
                        />
                        <form action={deleteLesson}>
                          <input type="hidden" name="id" value={lesson.id} />
                          <input
                            type="hidden"
                            name="courseId"
                            value={course.id}
                          />
                          <button
                            type="submit"
                            title="Delete lesson"
                            className="rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </form>
                      </span>
                    </li>
                  ))
                )}
              </ul>

              <LessonDialog courseId={course.id} moduleId={module.id} />
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardContent className="p-5">
            <form
              action={createModule}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="courseId" value={course.id} />
              <div className="min-w-[220px] flex-1">
                <label
                  htmlFor="module-title"
                  className="mb-1.5 block text-sm font-medium text-on-surface"
                >
                  Add module
                </label>
                <Input
                  id="module-title"
                  name="title"
                  placeholder="e.g. Airway Management"
                  required
                />
              </div>
              <Button type="submit" variant="outline">
                Add module
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-secondary/30 bg-secondary/5 p-5">
        <h2 className="font-semibold text-on-surface">Danger zone</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Deleting a course removes all modules, lessons, enrollments, and
          progress. This cannot be undone.
        </p>
        <form action={deleteCourse} className="mt-3">
          <input type="hidden" name="id" value={course.id} />
          <Button type="submit" variant="outline" className="text-secondary">
            <Trash2 aria-hidden /> Delete course
          </Button>
        </form>
      </section>
    </div>
  );
}
