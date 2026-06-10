import {
  ArrowLeft,
  Award,
  CheckCircle2,
  RotateCcw,
  UserMinus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminSetEnrollmentState } from "@/app/dashboard/courses/actions";
import { ConfirmActionDialog } from "@/components/dashboard/confirm-action-dialog";
import {
  type EnrollCandidate,
  EnrollGraduatesDialog,
} from "@/components/dashboard/enroll-graduates-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { coursesPrisma } from "@/lib/courses-db";
import { displayName } from "@/lib/graduate";
import { progressRatio } from "@/lib/lms";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          {icon}
        </div>
        <div>
          <p className="text-xs text-on-surface-variant">{label}</p>
          <p className="text-lg font-bold text-on-surface">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function CourseRosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const course = await coursesPrisma.course.findUnique({
    where: { id },
    include: {
      modules: {
        where: { state: "PUBLISHED" },
        include: {
          items: { where: { state: "PUBLISHED" }, select: { id: true } },
        },
      },
    },
  });
  if (!course || course.state === "DELETED") notFound();

  const totalItems = course.modules.reduce((s, m) => s + m.items.length, 0);

  const enrollments = await coursesPrisma.enrollment.findMany({
    where: { courseId: id },
    orderBy: { enrolledAt: "desc" },
  });

  // Done-item counts per enrollment (single query, tallied in memory).
  const doneRows = await coursesPrisma.itemProgress.findMany({
    where: {
      enrollmentId: { in: enrollments.map((e) => e.id) },
      completedAt: { not: null },
    },
    select: { enrollmentId: true },
  });
  const doneCount = new Map<string, number>();
  for (const r of doneRows) {
    doneCount.set(r.enrollmentId, (doneCount.get(r.enrollmentId) ?? 0) + 1);
  }

  // Resolve graduate names + detail-page ids from the main DB (soft refs),
  // and collect everyone not yet on the roster as enroll candidates.
  const enrolledLcns = enrollments.map((e) => e.graduateLcn);
  const [grads, candidatesRaw] = await Promise.all([
    prisma.graduate.findMany({
      where: { lcn: { in: enrolledLcns } },
      select: { id: true, lcn: true, name: true },
    }),
    prisma.graduate.findMany({
      where: { lcn: { notIn: enrolledLcns } },
      select: { lcn: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const gradByLcn = new Map(grads.map((g) => [g.lcn, g]));
  const candidates: EnrollCandidate[] = candidatesRaw.map((g) => ({
    lcn: g.lcn,
    name: displayName(g),
  }));

  const completed = enrollments.filter((e) => e.completedAt);
  const scores = completed
    .map((e) => e.finalScore)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  const completionRate =
    enrollments.length > 0
      ? Math.round((completed.length / enrollments.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/courses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-accent"
      >
        <ArrowLeft className="size-4" /> {course.title}
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label-caps text-accent">{course.title}</p>
          <h1 className="mt-1 text-headline-lg text-on-surface">Roster</h1>
        </div>
        <EnrollGraduatesDialog
          courseId={id}
          coursePublished={course.state === "PUBLISHED"}
          candidates={candidates}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Users className="size-5" />}
          label="Enrolled"
          value={String(enrollments.length)}
        />
        <Stat
          icon={<CheckCircle2 className="size-5" />}
          label="Completed"
          value={`${completed.length} · ${completionRate}%`}
        />
        <Stat
          icon={<Award className="size-5" />}
          label="Avg. final score"
          value={avgScore != null ? `${avgScore}%` : "—"}
        />
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<Users aria-hidden />}
          title="No enrollments yet"
          description="Enroll graduates from the registry, or wait for them to self-enroll in the portal — their progress shows up here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/60 shadow-[var(--shadow-clinical)] dark:border-white/[0.07]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-left text-on-primary dark:bg-surface-high">
                <th className="px-4 py-3 text-label-caps">Graduate</th>
                <th className="px-4 py-3 text-label-caps">Enrolled</th>
                <th className="px-4 py-3 text-label-caps">Progress</th>
                <th className="px-4 py-3 text-label-caps">Status</th>
                <th className="px-4 py-3 text-label-caps">Score</th>
                <th className="px-4 py-3 text-label-caps">Certificate</th>
                <th className="px-4 py-3 text-right text-label-caps">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => {
                const done = doneCount.get(e.id) ?? 0;
                const pct = Math.round(progressRatio(done, totalItems) * 100);
                const grad = gradByLcn.get(e.graduateLcn);
                const name = grad ? displayName(grad) : "Unknown";
                const dropped = e.state === "INACTIVE";
                return (
                  <tr
                    key={e.id}
                    className="bg-card text-on-surface odd:bg-surface-low/60 dark:odd:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      {grad ? (
                        <Link
                          href={`/dashboard/graduates/${grad.id}`}
                          className="font-medium hover:text-accent hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="font-medium">{name}</span>
                      )}
                      <span className="block text-data-mono text-on-surface-variant">
                        {e.graduateLcn}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {e.enrolledAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-high">
                          <span
                            className="block h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-data-mono text-on-surface-variant">
                          {done}/{totalItems}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.completedAt ? (
                        <Badge variant="verified">Completed</Badge>
                      ) : dropped ? (
                        <Badge variant="neutral">Dropped</Badge>
                      ) : (
                        <Badge variant="primary">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-data-mono text-on-surface-variant">
                      {e.finalScore != null ? `${e.finalScore}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-data-mono text-on-surface-variant">
                      {e.certificateNo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!e.completedAt &&
                        (dropped ? (
                          <form
                            action={adminSetEnrollmentState}
                            className="inline"
                          >
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="courseId" value={id} />
                            <input type="hidden" name="state" value="ACTIVE" />
                            <button
                              type="submit"
                              title="Reinstate enrollment"
                              className="inline-flex items-center gap-1 rounded p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <RotateCcw className="size-4" aria-hidden />
                              <span className="sr-only">Reinstate {name}</span>
                            </button>
                          </form>
                        ) : (
                          <ConfirmActionDialog
                            trigger={
                              <button
                                type="button"
                                title="Drop from course"
                                className="inline-flex items-center gap-1 rounded p-1.5 text-on-surface-variant hover:bg-secondary/10 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <UserMinus className="size-4" aria-hidden />
                                <span className="sr-only">Drop {name}</span>
                              </button>
                            }
                            title={`Drop ${name} from this course?`}
                            description="They lose portal access to the course; every progress record is kept and reinstating restores them exactly where they left off."
                            confirmLabel="Drop graduate"
                            action={adminSetEnrollmentState}
                            fields={{
                              id: e.id,
                              courseId: id,
                              state: "INACTIVE",
                            }}
                          />
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
