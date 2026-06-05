import { BookOpen } from "lucide-react";
import Link from "next/link";
import { enrollInCourse } from "@/app/portal/(app)/courses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { progressRatio } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalCoursesPage() {
  const { graduate } = await requireGraduate();

  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    include: {
      modules: { include: { lessons: { select: { id: true } } } },
      enrollments: { where: { graduateLcn: graduate.lcn } },
    },
  });

  const cards = await Promise.all(
    courses.map(async (course) => {
      const total = course.modules.reduce((s, m) => s + m.lessons.length, 0);
      const enrollment = course.enrollments[0] ?? null;
      const done = enrollment
        ? await prisma.lessonProgress.count({
            where: { enrollmentId: enrollment.id },
          })
        : 0;
      return { course, total, enrollment, done };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Courses</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Continuing-education courses for active graduates. Complete every
          lesson to earn a certificate.
        </p>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <BookOpen className="size-8 text-on-surface-variant" aria-hidden />
            <p className="text-sm text-on-surface-variant">
              No courses are published yet. Check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(({ course, total, enrollment, done }) => {
            const ratio = progressRatio(done, total);
            const completed = Boolean(enrollment?.completedAt);
            return (
              <Card key={course.id}>
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-on-surface">
                      {course.title}
                    </h2>
                    {completed ? (
                      <Badge variant="verified">Completed</Badge>
                    ) : enrollment ? (
                      <Badge variant="primary">Enrolled</Badge>
                    ) : null}
                  </div>
                  {course.summary && (
                    <p className="line-clamp-2 text-sm text-on-surface-variant">
                      {course.summary}
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant">
                    {total} lesson{total === 1 ? "" : "s"}
                  </p>

                  {enrollment && (
                    <div className="space-y-1">
                      <Progress value={ratio * 100} />
                      <p className="text-xs text-on-surface-variant">
                        {done}/{total} complete
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    {enrollment ? (
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
