import { ArrowLeft, CheckCircle2, Circle, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollInCourse } from "@/app/portal/(app)/courses/actions";
import { CeCertificate } from "@/components/portal/ce-certificate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { displayName } from "@/lib/graduate";
import { progressRatio } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalCourseOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { graduate } = await requireGraduate();
  const { slug } = await params;

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

  const doneIds = enrollment
    ? new Set(
        (
          await prisma.lessonProgress.findMany({
            where: { enrollmentId: enrollment.id },
            select: { lessonId: true },
          })
        ).map((p) => p.lessonId),
      )
    : new Set<string>();

  const lessons = course.modules.flatMap((m) => m.lessons);
  const total = lessons.length;
  const done = lessons.filter((l) => doneIds.has(l.id)).length;
  const firstUnfinished = lessons.find((l) => !doneIds.has(l.id)) ?? lessons[0];

  return (
    <div className="space-y-6">
      <Link
        href="/portal/courses"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Courses
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-on-surface">{course.title}</h1>
        {course.summary && (
          <p className="text-on-surface-variant">{course.summary}</p>
        )}
      </div>

      {!enrollment ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-on-surface-variant">
              {total} lesson{total === 1 ? "" : "s"}. Enroll to start tracking
              your progress.
            </p>
            <form action={enrollInCourse}>
              <input type="hidden" name="courseId" value={course.id} />
              <input type="hidden" name="slug" value={course.slug} />
              <Button type="submit">Enroll</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-on-surface">
                {done}/{total} lessons complete
              </p>
              {enrollment.completedAt ? (
                <Badge variant="verified">Completed</Badge>
              ) : (
                firstUnfinished && (
                  <Button asChild size="sm">
                    <Link
                      href={`/portal/courses/${course.slug}/${firstUnfinished.id}`}
                    >
                      {done === 0 ? "Start course" : "Resume"}
                    </Link>
                  </Button>
                )
              )}
            </div>
            <Progress value={progressRatio(done, total) * 100} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {course.modules.map((module, mi) => (
          <div key={module.id} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Module {mi + 1}: {module.title}
            </h2>
            <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-lg border border-outline-variant/60 bg-card">
              {module.lessons.map((lesson) => {
                const isDone = doneIds.has(lesson.id);
                const Inner = (
                  <span className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="size-5 shrink-0 text-accent" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-on-surface-variant/50" />
                    )}
                    <span className="text-sm text-on-surface">
                      {lesson.title}
                    </span>
                  </span>
                );
                return (
                  <li key={lesson.id}>
                    {enrollment ? (
                      <Link
                        href={`/portal/courses/${course.slug}/${lesson.id}`}
                        className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container"
                      >
                        {Inner}
                        {lesson.durationMins ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                            <Clock className="size-3.5" />
                            {lesson.durationMins} min
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        {Inner}
                        {lesson.durationMins ? (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                            <Clock className="size-3.5" />
                            {lesson.durationMins} min
                          </span>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {enrollment?.completedAt && enrollment.certificateNo && (
        <CeCertificate
          name={displayName(graduate)}
          courseTitle={course.title}
          certificateNo={enrollment.certificateNo}
          completedAt={enrollment.completedAt}
        />
      )}
    </div>
  );
}
