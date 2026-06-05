import { ArrowLeft, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { scoreTotal } from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { rollupGraduateScores } from "@/lib/student";
import {
  isPracticalPassing,
  isQuizPassing,
  PRACTICAL_DEFS,
  parseGranularGrades,
  QUIZ_DEFS,
  QUIZ_TOTAL_MAX,
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

const STATUS_BADGE = {
  IN_TRAINING: { variant: "primary" as const, label: "In Training" },
  GRADUATED: { variant: "verified" as const, label: "Graduated" },
  WITHDRAWN: { variant: "neutral" as const, label: "Withdrawn" },
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

  const grades = parseGranularGrades(s.granularGrades);
  const rolled = rollupGraduateScores(s);
  const total = scoreTotal(rolled);
  const badge = STATUS_BADGE[s.status];

  let quizRawTotal = 0;
  let quizEntered = 0;
  for (const def of QUIZ_DEFS) {
    const v = grades[def.key];
    if (typeof v === "number") {
      quizRawTotal += v;
      quizEntered += 1;
    }
  }

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
        {/* Left: photo */}
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

        {/* Right: profile + scores */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-outline-variant/40 pt-0">
              <Row
                label="Name"
                value={
                  [s.firstName, s.middleName, s.lastName, s.suffix]
                    .filter(Boolean)
                    .join(" ") || "—"
                }
              />
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
              <Row label="Last updated" value={s.updatedAt.toLocaleString()} />
            </CardContent>
          </Card>

          {/* Periodic Examinations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Periodic Examinations</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Quiz</th>
                      <th className="px-3 py-2 font-semibold">Topics</th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Max
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Pass
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Score
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {QUIZ_DEFS.map((def) => {
                      const v = grades[def.key];
                      const entered = typeof v === "number";
                      const pass =
                        entered && isQuizPassing(def.key, v as number);
                      return (
                        <tr
                          key={def.key}
                          className="odd:bg-card even:bg-surface-low"
                        >
                          <td className="px-3 py-2 font-medium">{def.label}</td>
                          <td className="px-3 py-2 text-on-surface-variant">
                            {def.topics}
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
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-outline-variant/60 border-t bg-surface-highest font-semibold">
                    <tr>
                      <td colSpan={2} className="px-3 py-2">
                        Quiz Total
                      </td>
                      <td className="px-3 py-2 text-center font-mono">
                        {QUIZ_TOTAL_MAX}
                      </td>
                      <td className="px-3 py-2 text-center font-mono">400</td>
                      <td className="px-3 py-2 text-center font-mono">
                        {quizEntered > 0 ? quizRawTotal : "—"}
                      </td>
                      <td className="px-3 py-2 text-center text-on-surface-variant">
                        {quizEntered > 0
                          ? `${Math.round((quizRawTotal / QUIZ_TOTAL_MAX) * 10000) / 100}% SJE`
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
                  {total}% computed total
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto rounded-md border border-outline-variant/60">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-surface-container">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Examination</th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Max
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Pass
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Raw
                      </th>
                      <th className="px-3 py-2 font-semibold text-center">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PRACTICAL_DEFS.map((def) => {
                      const v = s[def.key as keyof typeof s] as number | null;
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
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
