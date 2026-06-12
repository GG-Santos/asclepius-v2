import { ArrowLeft, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchLeaderboard } from "@/components/dashboard/batch-leaderboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeSchemeResult,
  isComponentPassing,
  parseGradingScheme,
  parseSchemeScores,
} from "@/lib/assessment-scheme";
import {
  gradeStudentForBatch,
  rollupForBatch,
  VERDICT_LABEL,
} from "@/lib/grading";
import { scoreTotal } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import {
  medalFor,
  rankCohortByActivity,
  studentActivities,
} from "@/lib/ranking";
import { requireAdmin } from "@/lib/session";
import {
  isPracticalPassing,
  isQuizPassing,
  PRACTICAL_DEFS,
  parseGranularGrades,
  quizDefsFor,
  quizMaxTotal,
} from "@/lib/student-grades";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right font-medium text-on-surface">{value}</span>
    </div>
  );
}

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        pass ? "bg-success/15 text-success" : "bg-error/15 text-error"
      }`}
    >
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

function rankCell(rank: number | undefined) {
  if (!rank) return <span className="text-on-surface-variant">—</span>;
  return (
    <span className="tabular font-medium text-on-surface-variant">
      {medalFor(rank) ?? ""} #{rank}
    </span>
  );
}

const STATUS_BADGE = {
  IN_TRAINING: { variant: "primary" as const, label: "In Training" },
  GRADUATED: { variant: "verified" as const, label: "Graduated" },
  WITHDRAWN: { variant: "neutral" as const, label: "Withdrawn" },
  FAILED: { variant: "expired" as const, label: "Failed" },
};

const VERDICT_STYLE = {
  pass: "bg-success/15 text-success",
  fail: "bg-error/15 text-error",
  incomplete: "bg-warning/15 text-warning",
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const s = await prisma.student.findUnique({
    where: { id },
    include: { photo: true, batch: true },
  });
  if (!s) notFound();

  const displayName =
    [s.firstName, s.middleName, s.lastName, s.suffix]
      .filter(Boolean)
      .join(" ") ||
    s.name ||
    s.enrollmentNo;

  // Quiz definitions follow the student's batch (legacy q1–q10 when none);
  // the six/total come from the scheme-aware rollup (Wave 4 renders full
  // scheme sections — until then the quiz table shows the quiz-def view).
  const quizDefs = quizDefsFor(s.batch?.quizDefs);
  const grades = parseGranularGrades(s.granularGrades, quizDefs);
  const rolled = rollupForBatch(s, s.batch);
  const total = scoreTotal(rolled);
  // Scheme batches render the grouped assessment table instead (R8).
  const scheme = parseGradingScheme(s.batch?.gradingScheme);
  const schemeScores = scheme
    ? parseSchemeScores(s.granularGrades, scheme)
    : null;
  const schemeResult =
    scheme && schemeScores
      ? computeSchemeResult(scheme, schemeScores, s.bonusPoints)
      : null;
  const badge = STATUS_BADGE[s.status];
  const verdict = gradeStudentForBatch(s, s.batch);

  // Cohort = the student's batch — used to rank each activity within the batch.
  const cohortSource = s.batchCode
    ? await prisma.student.findMany({
        where: { batchCode: s.batchCode },
        select: {
          id: true,
          name: true,
          enrollmentNo: true,
          scoreFWE: true,
          scoreEP: true,
          scorePAS: true,
          scoreCCST: true,
          scoreCCSM: true,
          bonusPoints: true,
          granularGrades: true,
        },
      })
    : null;
  const cohort = (cohortSource ?? [s]).map((c) => ({
    id: c.id,
    name: c.name?.trim() || c.enrollmentNo,
    activities: studentActivities(c),
  }));
  const myRanks =
    rankCohortByActivity(cohort).get(s.id) ?? new Map<string, number>();
  const myActivities = studentActivities(s);
  const weakest = myActivities
    .filter((a) => a.passed === false)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];

  let quizRawTotal = 0;
  let quizEntered = 0;
  for (const def of quizDefs) {
    const v = grades[def.key];
    if (typeof v === "number") {
      quizRawTotal += v;
      quizEntered += 1;
    }
  }
  const quizMax = quizMaxTotal(quizDefs);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <Link
          href="/dashboard/students"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to students
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-on-surface">
              {displayName}
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </h1>
            <p className="mt-1 font-mono text-sm text-on-surface-variant">
              {s.enrollmentNo}
            </p>
          </div>
          <Link
            href={`/dashboard/students/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/60 bg-card px-3 py-1.5 text-sm text-on-surface hover:bg-surface-container"
          >
            <Pencil className="size-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card>
          <CardContent className="p-5">
            {s.photo?.url ? (
              <Image
                src={s.photo.url}
                alt={displayName}
                width={280}
                height={350}
                className="w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-surface-highest">
                <span className="text-sm text-on-surface-variant">
                  No photo
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Graduation standing */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Graduation standing</CardTitle>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${VERDICT_STYLE[verdict.verdict]}`}
              >
                {VERDICT_LABEL[verdict.verdict]}
              </span>
            </CardHeader>
            <CardContent className="pt-0 text-sm">
              <p className="text-on-surface-variant">
                Weighted average:{" "}
                <strong className="tabular text-on-surface">
                  {verdict.weighted != null ? `${verdict.weighted}%` : "—"}
                </strong>{" "}
                (pass mark 70%).
              </p>
              {weakest ? (
                <p className="mt-1 text-on-surface-variant">
                  Weakest area:{" "}
                  <strong className="text-secondary">{weakest.label}</strong>
                  {weakest.pct != null ? ` (${weakest.pct}%)` : ""} — below its
                  pass mark.
                </p>
              ) : verdict.verdict === "pass" ? (
                <p className="mt-1 text-success">
                  Passing every assessed area.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-outline-variant/40 pt-0">
              <Row label="Enrollment No." value={s.enrollmentNo} />
              <Row label="Status" value={badge.label} />
              <Row
                label="Batch"
                value={
                  s.batchCode
                    ? `${s.batchCode}${s.batch?.label ? ` · ${s.batch.label}` : ""}`
                    : "—"
                }
              />
              {s.graduatedToLcn && (
                <Row
                  label="Graduated to LCN"
                  value={
                    <Link
                      href={`/dashboard/graduates?q=${encodeURIComponent(s.graduatedToLcn)}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {s.graduatedToLcn}
                    </Link>
                  }
                />
              )}
              <Row label="Created" value={s.createdAt.toLocaleString()} />
            </CardContent>
          </Card>

          {/* Scheme batches: grouped assessment table replaces the legacy
              quiz + practical sections (R8). */}
          {scheme && schemeResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Assessments
                  <span className="ml-2 text-xs font-normal text-on-surface-variant">
                    {scheme.mode === "total-points"
                      ? `total points — passing ${schemeResult.passingTotal}`
                      : "weighted categories"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-surface-container">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Component</th>
                        <th className="px-3 py-2 text-center font-semibold">
                          Max
                        </th>
                        <th className="px-3 py-2 text-center font-semibold">
                          Score
                        </th>
                        <th className="px-3 py-2 text-center font-semibold">
                          Badge
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheme.categories.map((category) => {
                        const comps = scheme.components.filter(
                          (c) => c.group === category.key,
                        );
                        const g = schemeResult.groups[category.key];
                        return [
                          <tr
                            key={`g-${category.key}`}
                            className="bg-surface-highest font-semibold"
                          >
                            <td className="px-3 py-1.5">
                              {category.label}
                              <span className="ml-2 font-normal text-on-surface-variant">
                                {category.weight}%
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono">
                              {g?.max ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono">
                              {g?.contribution != null
                                ? `${g.contribution}%`
                                : g && g.entered > 0
                                  ? g.sum
                                  : "—"}
                            </td>
                            <td />
                          </tr>,
                          ...comps.map((c) => {
                            const v = schemeScores?.[c.key];
                            const entered = typeof v === "number";
                            const pass = entered
                              ? isComponentPassing(c, v as number)
                              : null;
                            return (
                              <tr
                                key={c.key}
                                className="odd:bg-card even:bg-surface-low"
                              >
                                <td className="px-3 py-2 pl-6">
                                  {c.label}
                                  {c.date && (
                                    <span className="ml-2 text-[10px] text-on-surface-variant">
                                      {c.date}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {c.maxScore}
                                </td>
                                <td className="px-3 py-2 text-center font-mono">
                                  {entered ? v : "—"}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {pass === null ? (
                                    <span className="text-on-surface-variant">
                                      —
                                    </span>
                                  ) : (
                                    <PassBadge pass={pass} />
                                  )}
                                </td>
                              </tr>
                            );
                          }),
                        ];
                      })}
                    </tbody>
                    <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                      <tr>
                        <td className="px-3 py-2">
                          Total{" "}
                          {typeof s.bonusPoints === "number" &&
                            s.bonusPoints !== 0 && (
                              <span className="font-normal text-on-surface-variant">
                                (incl.{" "}
                                {schemeResult.bonusApplied > 0
                                  ? `+${schemeResult.bonusApplied}`
                                  : schemeResult.bonusApplied}{" "}
                                bonus
                                {s.bonusNote ? ` — ${s.bonusNote}` : ""})
                              </span>
                            )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {schemeResult.totalMax}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {schemeResult.total ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-center text-xs uppercase">
                          {schemeResult.verdict}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!scheme && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Periodic Examinations
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-surface-container">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Quiz</th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Max
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Pass
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Score
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Status
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Batch rank
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {quizDefs.map((def) => {
                          const v = grades[def.key];
                          const entered = typeof v === "number";
                          const pass =
                            entered &&
                            isQuizPassing(def.key, v as number, quizDefs);
                          return (
                            <tr
                              key={def.key}
                              className="odd:bg-card even:bg-surface-low"
                            >
                              <td className="px-3 py-2 font-medium">
                                {def.label}
                                {def.date && (
                                  <span className="block text-[10px] font-normal text-on-surface-variant">
                                    {def.date}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {def.maxScore}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {def.passing}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {entered ? v : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {entered ? (
                                  <PassBadge pass={pass} />
                                ) : (
                                  <span className="text-on-surface-variant">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {rankCell(myRanks.get(def.key))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                        <tr>
                          <td className="px-3 py-2">Quiz Total → SJE</td>
                          <td className="px-3 py-2 text-center font-mono">
                            {quizMax}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {Math.round(quizMax / 2)}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {quizEntered > 0 ? quizRawTotal : "—"}
                          </td>
                          <td
                            colSpan={2}
                            className="px-3 py-2 text-center text-on-surface-variant"
                          >
                            {quizEntered > 0
                              ? `${Math.round((quizRawTotal / quizMax) * 10000) / 100}% SJE`
                              : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Final & Practical Examinations */}
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Final &amp; Practical Examinations
                  </CardTitle>
                  {total !== null && (
                    <span className="text-sm font-semibold text-on-surface">
                      {total}% weighted total
                    </span>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-surface-container">
                        <tr>
                          <th className="px-3 py-2 font-semibold">
                            Examination
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Max
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Pass
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Raw
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Status
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Batch rank
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {PRACTICAL_DEFS.map((def) => {
                          const v = s[def.key as keyof typeof s] as
                            | number
                            | null;
                          const entered = typeof v === "number";
                          const pass =
                            entered && isPracticalPassing(def.key, v as number);
                          return (
                            <tr
                              key={def.key}
                              className="odd:bg-card even:bg-surface-low"
                            >
                              <td className="px-3 py-2">{def.label}</td>
                              <td className="px-3 py-2 text-center font-mono">
                                {def.maxScore}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {def.passing}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                {entered ? v : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {entered ? (
                                  <PassBadge pass={pass} />
                                ) : (
                                  <span className="text-on-surface-variant">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {rankCell(myRanks.get(def.key))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Per-activity leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Batch leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <BatchLeaderboard cohort={cohort} highlightId={s.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
