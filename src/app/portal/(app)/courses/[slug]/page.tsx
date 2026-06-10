import { ArrowLeft, CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { enrollInCourse } from "@/app/portal/(app)/courses/actions";
import { ItemTypeIcon } from "@/components/dashboard/module-item-dialog";
import { CeCertificate } from "@/components/portal/ce-certificate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCover } from "@/components/ui/course-cover";
import { Progress } from "@/components/ui/progress";
import { loadCourseView } from "@/lib/course-view";
import { displayName } from "@/lib/graduate";
import { progressRatio } from "@/lib/lms";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalCourseOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { graduate } = await requireGraduate();
  const { slug } = await params;

  const view = await loadCourseView(graduate.lcn, slug);
  if (!view) notFound();

  const { course, enrollment, modules, totalItems, doneItems, nextItem } = view;

  return (
    <div className="space-y-6">
      <Link
        href="/portal/courses"
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> Courses
      </Link>

      {/* Hero — cover with a deep-teal scrim and the title overlaid. */}
      <div className="relative overflow-hidden rounded-xl border border-outline-variant/60 shadow-[var(--shadow-clinical-md)] dark:border-white/[0.07]">
        <CourseCover
          title={course.title}
          src={course.coverImage}
          className="aspect-[21/9]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <p className="text-label-caps text-white/70">Continuing education</p>
          <h1 className="mt-1 text-display-lg text-white">{course.title}</h1>
          {course.summary && (
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              {course.summary}
            </p>
          )}
        </div>
      </div>

      {!enrollment ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            {view.enrollmentDropped ? (
              <p className="text-sm text-on-surface-variant">
                Your enrollment in this course is paused. Contact WSL EMS to
                resume — your progress is saved.
              </p>
            ) : (
              <>
                <p className="text-sm text-on-surface-variant">
                  {totalItems} item{totalItems === 1 ? "" : "s"}. Enroll to
                  start tracking your progress.
                </p>
                <form action={enrollInCourse}>
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="slug" value={course.slug} />
                  <Button type="submit">Enroll</Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-on-surface">
                {doneItems}/{totalItems} items complete
              </p>
              {enrollment.completedAt ? (
                <Badge variant="verified">Completed</Badge>
              ) : (
                nextItem && (
                  <Button asChild size="sm">
                    <Link
                      href={`/portal/courses/${course.slug}/${nextItem.itemId}`}
                    >
                      {doneItems === 0 ? "Start course" : "Resume"}
                    </Link>
                  </Button>
                )
              )}
            </div>
            <Progress value={progressRatio(doneItems, totalItems) * 100} />
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {modules.map((module, mi) => (
          <div key={module.id} className="space-y-2">
            <h2 className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-data-mono text-primary dark:bg-accent/10 dark:text-accent">
                {mi + 1}
              </span>
              <span className="text-title-md text-on-surface">
                {module.title}
              </span>
              {module.complete ? (
                <Badge variant="verified">Done</Badge>
              ) : !module.unlocked ? (
                <Badge variant="neutral">
                  <Lock className="size-3" /> Locked
                </Badge>
              ) : null}
            </h2>
            <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-lg border border-outline-variant/60 bg-card">
              {module.items.map((item) => {
                const Inner = (
                  <span className="flex min-w-0 items-center gap-3">
                    {item.done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-accent" />
                    ) : !item.available ? (
                      <Lock className="size-4 shrink-0 text-on-surface-variant/50" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-on-surface-variant/50" />
                    )}
                    <ItemTypeIcon type={item.type} />
                    <span className="truncate text-sm text-on-surface">
                      {item.title}
                    </span>
                  </span>
                );
                const meta = item.estimatedMins ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                    <Clock className="size-3.5" />
                    {item.estimatedMins} min
                  </span>
                ) : null;
                return (
                  <li key={item.id}>
                    {enrollment && item.available ? (
                      <Link
                        href={`/portal/courses/${course.slug}/${item.id}`}
                        className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container"
                      >
                        {Inner}
                        {meta}
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-4 py-3 opacity-70">
                        {Inner}
                        {meta}
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
