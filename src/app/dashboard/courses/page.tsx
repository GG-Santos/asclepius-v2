import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseCover } from "@/components/ui/course-cover";
import { EmptyState } from "@/components/ui/empty-state";
import { coursesPrisma } from "@/lib/courses-db";
import { requireAdmin } from "@/lib/session";

const STATE_BADGE: Record<
  string,
  { label: string; variant: "verified" | "neutral" | "primary" }
> = {
  PUBLISHED: { label: "Published", variant: "verified" },
  UNPUBLISHED: { label: "Draft", variant: "neutral" },
  ARCHIVED: { label: "Archived", variant: "primary" },
};

export default async function CoursesPage() {
  await requireAdmin();

  const courses = await coursesPrisma.course.findMany({
    where: { state: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <PageHeader
        eyebrow="Learning · CE"
        title="Courses"
        meta={
          <p className="max-w-prose">
            Continuing-education courses for active graduates. Publish a course
            to make it available in the graduate portal.
          </p>
        }
        actions={
          <Button asChild>
            <Link href="/dashboard/courses/new">
              <Plus aria-hidden /> New course
            </Link>
          </Button>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden />}
          title="No courses yet"
          description="Create your first course to start building the LMS."
          action={
            <Button asChild>
              <Link href="/dashboard/courses/new">
                <Plus aria-hidden /> New course
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const badge = STATE_BADGE[course.state] ?? STATE_BADGE.UNPUBLISHED;
            return (
              <Link
                key={course.id}
                href={`/dashboard/courses/${course.id}`}
                className="group flex flex-col overflow-hidden rounded-lg border border-outline-variant/60 bg-card shadow-[var(--shadow-clinical)] transition-all hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[var(--shadow-clinical-md)] dark:border-white/[0.07]"
              >
                <div className="relative">
                  <CourseCover title={course.title} src={course.coverImage} />
                  <div className="absolute right-3 top-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-title-md text-on-surface group-hover:text-accent">
                    {course.title}
                  </h2>
                  {course.summary && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-on-surface-variant">
                      {course.summary}
                    </p>
                  )}
                  <p className="mt-4 flex items-center gap-2 text-data-mono text-on-surface-variant">
                    {course._count.modules} module
                    {course._count.modules === 1 ? "" : "s"}
                    <span className="text-outline-variant">·</span>
                    {course._count.enrollments} enrolled
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
