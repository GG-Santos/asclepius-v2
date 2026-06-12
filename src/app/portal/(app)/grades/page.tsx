import { ChevronRight, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeSchemeResult,
  isComponentPassing,
  isLegacyGradeBookBatch,
  parseGradingScheme,
  parseSchemeScores,
} from "@/lib/assessment-scheme";
import { prisma } from "@/lib/prisma";
import { requireGraduate } from "@/lib/session";
import {
  isPracticalPassing,
  isQuizPassing,
  PRACTICAL_DEFS,
  parseGranularGrades,
  quizDefsFor,
  quizMaxTotal,
} from "@/lib/student-grades";

export const metadata: Metadata = { title: "My grades" };

/** "2023-05-14" -> "05/14/23" for compact exam-date display. */
function fmtExamDate(iso?: string): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : null;
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

export default async function PortalGradesPage() {
  const { graduate: g } = await requireGraduate();
  const legacyGradeBook = isLegacyGradeBookBatch(g.batchCode);

  // Student-era records (quiz + practical raw scores), when this graduate
  // was promoted from a student record (Batch 17+).
  const student = g.fromStudentEnrollmentNo
    ? await prisma.student.findUnique({
        where: { enrollmentNo: g.fromStudentEnrollmentNo },
        include: {
          batch: { select: { quizDefs: true, gradingScheme: true } },
        },
      })
    : null;
  // Scheme batches render the grouped assessment record (R8).
  const scheme = student
    ? parseGradingScheme(student.batch?.gradingScheme)
    : null;
  const schemeScores =
    student && scheme
      ? parseSchemeScores(student.granularGrades, scheme)
      : null;
  const schemeResult =
    student && scheme && schemeScores
      ? computeSchemeResult(scheme, schemeScores, student.bonusPoints)
      : null;
  const hasSchemeData =
    schemeScores !== null &&
    Object.values(schemeScores).some((v) => typeof v === "number");

  const quizDefs =
    student && !scheme ? quizDefsFor(student.batch?.quizDefs) : null;
  const grades =
    student && quizDefs
      ? parseGranularGrades(student.granularGrades, quizDefs)
      : null;
  const hasQuizData =
    grades !== null && Object.values(grades).some((v) => typeof v === "number");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-on-surface">
          <GraduationCap className="size-5 text-accent" aria-hidden /> My grades
        </h1>
        <p className="text-sm text-on-surface-variant">
          Your proficiency evaluation as recorded in the official registry.
        </p>
      </div>

      {/* Proficiency scores from the training grade record */}
      {!legacyGradeBook && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proficiency scores</CardTitle>
          </CardHeader>
          <CardContent>
            {hasSchemeData && scheme && schemeScores && schemeResult ? (
              <div className="space-y-2">
                {scheme.categories.map((category) => {
                  const comps = scheme.components.filter(
                    (c) => c.group === category.key,
                  );
                  const grp = schemeResult.groups[category.key];
                  return (
                    <details
                      key={category.key}
                      className="group rounded-md border border-outline-variant/60"
                    >
                      <summary className="flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-surface-highest px-3 py-2 text-sm font-semibold text-on-surface [&::-webkit-details-marker]:hidden">
                        <ChevronRight
                          className="size-4 shrink-0 text-on-surface-variant transition-transform group-open:rotate-90"
                          aria-hidden
                        />
                        <span className="w-10 font-normal text-on-surface-variant">
                          {category.weight}%
                        </span>
                        <span>{category.label}</span>
                        <span className="ml-auto flex items-center font-mono text-xs">
                          <span
                            className="w-24 text-right text-on-surface-variant"
                            title="Raw score / max"
                          >
                            {grp && grp.entered > 0
                              ? `${grp.sum}/${grp.max}`
                              : `—/${grp?.max ?? "—"}`}
                          </span>
                          <span
                            className="w-16 text-right"
                            title="Category percentage"
                          >
                            {grp?.averagePercent != null
                              ? `${grp.averagePercent}%`
                              : "—"}
                          </span>
                          <span
                            className="w-20 text-right text-accent"
                            title={`Weighted points (of ${category.weight})`}
                          >
                            {grp?.contribution != null
                              ? `${grp.contribution} pts`
                              : "—"}
                          </span>
                        </span>
                      </summary>
                      <div className="overflow-x-auto border-outline-variant/60 border-t">
                        <table className="w-full table-fixed text-left text-xs">
                          <colgroup>
                            <col />
                            <col className="w-14" />
                            <col className="w-14" />
                            <col className="w-14" />
                            <col className="w-20" />
                          </colgroup>
                          <thead className="bg-surface-container">
                            <tr>
                              <th className="px-3 py-2 font-semibold">
                                Assessment
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                Max
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                Score
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                %
                              </th>
                              <th className="px-3 py-2 text-center font-semibold">
                                Result
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {comps.map((c) => {
                              const v = schemeScores[c.key];
                              const entered = typeof v === "number";
                              const pass = entered
                                ? isComponentPassing(c, v as number)
                                : null;
                              return (
                                <tr
                                  key={c.key}
                                  className="odd:bg-card even:bg-surface-low"
                                >
                                  <td className="truncate px-3 py-2">
                                    <span className="mr-2 inline-block w-14 font-mono text-[10px] text-on-surface-variant">
                                      {fmtExamDate(c.date) ?? ""}
                                    </span>
                                    {c.label}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono">
                                    {c.maxScore}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono">
                                    {entered ? v : "—"}
                                  </td>
                                  <td className="px-3 py-2 text-center font-mono">
                                    {entered
                                      ? `${Math.round(((v as number) / c.maxScore) * 1000) / 10}%`
                                      : "—"}
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
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  );
                })}

                {schemeResult.bonusApplied !== 0 && (
                  <div className="flex items-center justify-between rounded-md border border-outline-variant/60 px-3 py-2 text-sm">
                    <span className="font-semibold text-on-surface">
                      Bonus points
                    </span>
                    <span className="font-mono text-accent">
                      {schemeResult.bonusApplied > 0
                        ? `+${schemeResult.bonusApplied}`
                        : schemeResult.bonusApplied}{" "}
                      pts
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-md bg-surface-highest px-3 py-2 text-sm font-semibold text-on-surface">
                  <span>Total Evaluation</span>
                  <span className="font-mono">
                    {schemeResult.total ?? "—"} / 100
                  </span>
                </div>
              </div>
            ) : hasQuizData && quizDefs && grades ? (
              <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Quiz</th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Max
                      </th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Passing
                      </th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Score
                      </th>
                      <th className="px-3 py-2 text-center font-semibold">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizDefs.map((def) => {
                      const v = grades[def.key];
                      const entered = typeof v === "number";
                      return (
                        <tr
                          key={def.key}
                          className="odd:bg-card even:bg-surface-low"
                        >
                          <td className="px-3 py-2 font-medium">{def.label}</td>
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
                              <PassBadge
                                pass={isQuizPassing(
                                  def.key,
                                  v as number,
                                  quizDefs,
                                )}
                              />
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-outline-variant/60 border-t bg-surface-highest text-xs font-semibold">
                    <tr>
                      <td className="px-3 py-2">Quiz total</td>
                      <td className="px-3 py-2 text-center font-mono">
                        {quizMaxTotal(quizDefs)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">
                No per-quiz training records exist for your batch — detailed
                quiz tracking began with later cohorts. Your overall evaluation
                above is the official record.
              </p>
            )}

            {student &&
              (() => {
                const practicals = PRACTICAL_DEFS.map((def) => ({
                  def,
                  v: student[def.key],
                })).filter((p) => typeof p.v === "number");
                if (practicals.length === 0) return null;
                return (
                  <div className="mt-4 overflow-x-auto rounded-md border border-outline-variant/60">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-surface-container">
                        <tr>
                          <th className="px-3 py-2 font-semibold">
                            Final &amp; practical exams
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Max
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Passing
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Score
                          </th>
                          <th className="px-3 py-2 text-center font-semibold">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {practicals.map(({ def, v }) => (
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
                              {v}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <PassBadge
                                pass={isPracticalPassing(def.key, v as number)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
