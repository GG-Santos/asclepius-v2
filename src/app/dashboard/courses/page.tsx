import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function CoursesPage() {
  await requireAdmin();

  const courses = await prisma.course.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Courses</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            LMS courses for active graduates. Publish a course to make it
            available in the graduate portal.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/courses/new">
            <Plus aria-hidden /> New course
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <BookOpen className="size-8 text-on-surface-variant" aria-hidden />
            <p className="text-sm text-on-surface-variant">
              No courses yet. Create your first course to start building the
              LMS.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/courses/new">
                <Plus aria-hidden /> New course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className="group rounded-lg border border-outline-variant/60 bg-card p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-on-surface group-hover:text-accent">
                  {course.title}
                </h2>
                <Badge
                  variant={
                    course.status === "PUBLISHED" ? "verified" : "neutral"
                  }
                >
                  {course.status === "PUBLISHED" ? "Published" : "Draft"}
                </Badge>
              </div>
              {course.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
                  {course.summary}
                </p>
              )}
              <p className="mt-4 text-xs text-on-surface-variant">
                {course._count.modules} module
                {course._count.modules === 1 ? "" : "s"} ·{" "}
                {course._count.enrollments} enrolled
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
