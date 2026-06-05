import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { markLessonComplete } from "@/app/portal/(app)/courses/actions";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { graduate } = await requireGraduate();
  const { slug, lessonId } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!course || course.status !== "PUBLISHED") notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      graduateLcn_courseId: { graduateLcn: graduate.lcn, courseId: course.id },
    },
  });
  // Must enroll before viewing lesson content.
  if (!enrollment) redirect(`/portal/courses/${slug}`);

  const lessons = course.modules.flatMap((m) => m.lessons);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) notFound();
  const lesson = lessons[index];
  const prev = index > 0 ? lessons[index - 1] : null;
  const next = index < lessons.length - 1 ? lessons[index + 1] : null;

  const progress = await prisma.lessonProgress.findUnique({
    where: {
      enrollmentId_lessonId: {
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      },
    },
  });
  const isDone = Boolean(progress);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/portal/courses/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Lesson {index + 1} of {lessons.length}
        </p>
        {isDone && (
          <Badge variant="verified">
            <CheckCircle2 className="size-3.5" /> Complete
          </Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold text-on-surface">{lesson.title}</h1>

      <article className="max-w-none">
        {lesson.content.trim() ? (
          <Markdown content={lesson.content} />
        ) : (
          <p className="text-sm text-on-surface-variant">
            This lesson has no content yet.
          </p>
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-5">
        {prev ? (
          <Button asChild variant="ghost">
            <Link href={`/portal/courses/${slug}/${prev.id}`}>
              <ArrowLeft aria-hidden /> Previous
            </Link>
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {!isDone && (
            <form action={markLessonComplete}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="slug" value={slug} />
              <Button type="submit">
                <Check aria-hidden /> Mark complete
              </Button>
            </form>
          )}
          {next ? (
            <Button asChild variant={isDone ? "default" : "outline"}>
              <Link href={`/portal/courses/${slug}/${next.id}`}>
                Next <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button asChild variant={isDone ? "default" : "outline"}>
              <Link href={`/portal/courses/${slug}`}>Finish</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
