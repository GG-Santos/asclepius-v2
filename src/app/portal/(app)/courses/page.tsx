import { BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { enrollInCourse } from "@/app/portal/(app)/courses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/ui/course-cover";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { coursesPrisma } from "@/lib/courses-db";
import { progressRatio } from "@/lib/lms";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalCoursesPage() {
  const { graduate } = await requireGraduate();

  const courses = await coursesPrisma.course.findMany({
    where: { state: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      modules: {
        where: { state: "PUBLISHED" },
        include: {
          items: { where: { state: "PUBLISHED" }, select: { id: true } },
        },
      },
      enrollments: { where: { graduateLcn: graduate.lcn } },
    },
  });

  const cards = await Promise.all(
    courses.map(async (course) => {
      const total = course.modules.reduce((s, m) => s + m.items.length, 0);
      const enrollment = course.enrollments[0] ?? null;
      const done = enrollment
        ? await coursesPrisma.itemProgress.count({
            where: { enrollmentId: enrollment.id, completedAt: { not: null } },
          })
        : 0;
      return { course, total, enrollment, done };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-label-caps text-accent">Continuing education</p>
        <h1 className="mt-1 text-headline-lg text-on-surface">Courses</h1>
        <p className="mt-1.5 max-w-prose text-sm text-on-surface-variant">
          Complete every required item to earn a certificate you can download.
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden />}
          title="No courses published yet"
          description="Check back soon for continuing-education resources."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map(({ course, total, enrollment, done }) => {
            const ratio = progressRatio(done, total);
            const completed = Boolean(enrollment?.completedAt);
            const dropped = enrollment?.state === "INACTIVE";
            return (
              <div
                key={course.id}
                className="flex flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)] dark:border-white/[0.07]"
              >
                <div className="relative">
                  <CourseCover title={course.title} src={course.coverImage} />
                  {(completed || enrollment) && (
                    <div className="absolute right-3 top-3">
                      {completed ? (
                        <Badge variant="verified">
                          <CheckCircle2 className="size-3.5" /> Completed
                        </Badge>
                      ) : dropped ? (
                        <Badge variant="neutral">Paused</Badge>
                      ) : (
                        <Badge variant="primary">Enrolled</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h2 className="text-title-md text-on-surface">
                      {course.title}
                    </h2>
                    {course.summary && (
                      <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                        {course.summary}
                      </p>
                    )}
                  </div>
                  <p className="text-data-mono text-on-surface-variant">
                    {total} item{total === 1 ? "" : "s"}
                  </p>

                  {enrollment && !dropped && (
                    <div className="space-y-1">
                      <Progress value={ratio * 100} />
                      <p className="text-xs text-on-surface-variant">
                        {done}/{total} complete
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-1">
                    {dropped ? (
                      <p className="text-center text-xs text-on-surface-variant">
                        Enrollment paused — contact WSL EMS to resume. Your
                        progress is saved.
                      </p>
                    ) : enrollment ? (
                      <Button asChild variant="outline" className="w-full">
                        <Link href={`/portal/courses/${course.slug}`}>
                          {completed ? "Review course" : "Continue"}
                        </Link>
                      </Button>
                    ) : (
                      <form action={enrollInCourse}>
                        <input
                          type="hidden"
                          name="courseId"
                          value={course.id}
                        />
                        <input type="hidden" name="slug" value={course.slug} />
                        <Button type="submit" className="w-full">
                          Enroll
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
