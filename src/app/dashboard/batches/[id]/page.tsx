import { ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BatchDetailClient,
  type BatchStatus,
} from "@/components/dashboard/batch-detail-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseGradingScheme } from "@/lib/assessment-scheme";
import { gradeStudentForBatch, rollupBatch } from "@/lib/grading";
import {
  isLegacyBatch,
  isRecordsOnlyBatch,
  scoreTotal,
  verificationState,
} from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import { medalFor, rankGraduates } from "@/lib/ranking";
import { requireUser } from "@/lib/session";

function fmt(d: Date | null): string | null {
  return d
    ? d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
}

/** "2023-05-14" -> "05/14/23" for compact exam-date display. */
function fmtExamDate(iso?: string): string | null {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1].slice(2)}` : null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-right font-medium text-on-surface">{value}</span>
    </div>
  );
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const role = session.user.role;
  if (role !== "admin" && role !== "professor") {
    redirect("/dashboard?denied=area");
  }
  const { id } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      logo: { select: { url: true } },
      students: {
        where: { status: "IN_TRAINING" },
        select: {
          id: true,
          enrollmentNo: true,
          name: true,
          photo: { select: { url: true } },
          scoreFWE: true,
          scoreEP: true,
          scorePAS: true,
          scoreCCST: true,
          scoreCCSM: true,
          granularGrades: true,
          bonusPoints: true,
        },
        orderBy: { enrollmentNo: "asc" },
      },
      graduates: {
        select: {
          id: true,
          lcn: true,
          name: true,
          status: true,
          legacy: true,
          expiresAt: true,
          expirationRaw: true,
          photo: { select: { url: true } },
          scoreFWE: true,
          scoreSJE: true,
          scoreEP: true,
          scorePAS: true,
          scoreCCST: true,
          scoreCCSM: true,
          bonusPoints: true,
        },
      },
    },
  });

  if (!batch) notFound();
  if (role === "professor" && batch.professorId !== session.user.id) {
    redirect("/dashboard?denied=area");
  }
  const canManage = role === "admin";

  // Accounts an admin can assign as this batch's professor.
  const professors = await prisma.user.findMany({
    where: { role: { in: ["admin", "professor"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Completed cohort outcome (graduated + failed students) for the true
  // pass rate, plus the batch's grading scheme for the read-only summary.
  const [passedCount, failedRecords] = await Promise.all([
    prisma.student.count({
      where: { batchCode: batch.code, status: "GRADUATED" },
    }),
    prisma.student.findMany({
      where: { batchCode: batch.code, status: "FAILED" },
      select: {
        id: true,
        enrollmentNo: true,
        name: true,
        photo: { select: { url: true } },
        scoreFWE: true,
        scoreEP: true,
        scorePAS: true,
        scoreCCST: true,
        scoreCCSM: true,
        granularGrades: true,
        bonusPoints: true,
      },
      orderBy: { enrollmentNo: "asc" },
    }),
  ]);
  const failedCount = failedRecords.length;
  const cohortPassRate =
    passedCount + failedCount > 0
      ? Math.round((passedCount / (passedCount + failedCount)) * 100)
      : null;
  const scheme = parseGradingScheme(batch.gradingScheme);

  // Failed students roster: their computed total under the batch scheme.
  const failedStudents = failedRecords.map((s) => {
    const g = gradeStudentForBatch(s, batch);
    return {
      id: s.id,
      name: s.name?.trim() || s.enrollmentNo,
      enrollmentNo: s.enrollmentNo,
      photoUrl: s.photo?.url ?? null,
      total: g.weighted,
      verdict: "fail" as const,
      rank: null,
    };
  });

  // In-training students: projected grade + rank within the cohort.
  const studentGrades = batch.students.map((s) => ({
    s,
    g: gradeStudentForBatch(s, batch),
  }));
  const summary = rollupBatch(studentGrades.map((x) => x.g));
  const sRank = new Map<string, number>();
  studentGrades
    .filter((x) => x.g.weighted != null)
    .sort((a, b) => (b.g.weighted ?? 0) - (a.g.weighted ?? 0))
    .forEach((x, i) => {
      sRank.set(x.s.id, i + 1);
    });
  const inTraining = studentGrades.map(({ s, g }) => ({
    id: s.id,
    name: s.name?.trim() || s.enrollmentNo,
    enrollmentNo: s.enrollmentNo,
    photoUrl: s.photo?.url ?? null,
    total: g.weighted ?? scoreTotal(g.six),
    verdict: g.verdict,
    rank: sRank.get(s.id) ?? null,
  }));

  // Graduates: weighted batch rank (non-archived, non-legacy) + medal +
  // license state. Legacy records have no grade data to rank.
  const gRanks = rankGraduates(
    batch.graduates
      .filter((g) => verificationState(g) !== "archived" && !g.legacy)
      .map((g) => ({ id: g.id, six: g })),
  );
  const graduates = batch.graduates
    .map((g) => {
      const r = gRanks.get(g.id);
      return {
        id: g.id,
        lcn: g.lcn,
        name: g.name?.trim() || `License ${g.lcn}`,
        photoUrl: g.photo?.url ?? null,
        total: scoreTotal(g),
        rank: r?.rank ?? null,
        medal: medalFor(r?.rank ?? null),
        expirationRaw: g.expirationRaw,
        state: verificationState(g),
      };
    })
    .sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));

  const status: BatchStatus = batch.graduated
    ? "graduated"
    : inTraining.length > 0 && graduates.length > 0
      ? "partial"
      : inTraining.length > 0
        ? "training"
        : graduates.length > 0
          ? "graduated"
          : "empty";

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <Link
          href="/dashboard/batches"
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-accent"
        >
          <ArrowLeft className="size-4" /> Back to batches
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-on-surface">
              {batch.batchNumber ? `Batch ${batch.batchNumber}` : batch.code}
              {batch.label && (
                <span className="text-lg font-normal text-on-surface-variant">
                  — {batch.label}
                </span>
              )}
              {isLegacyBatch(batch.code) && (
                <Badge variant="legacy">Legacy</Badge>
              )}
              {isRecordsOnlyBatch(batch.code) && (
                <Badge variant="neutral">Records only</Badge>
              )}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              {batch.graduated
                ? `${graduates.length} graduated${failedCount > 0 ? ` · ${failedCount} did not pass` : ""}`
                : `${inTraining.length} in training${failedCount > 0 ? ` · ${failedCount} did not pass` : ""}`}
            </p>
          </div>
          {canManage && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/batches/${batch.id}/edit`}>
                <Pencil aria-hidden /> Edit batch
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-outline-variant/40 pt-0">
          <Row label="Code" value={batch.code} />
          <Row label="Professor" value={batch.professor ?? "—"} />
          <Row
            label="Graduated"
            value={
              batch.graduated ? (fmt(batch.graduatedAt) ?? "Yes") : "Not yet"
            }
          />
          <Row
            label="Cohort"
            value={
              batch.graduated
                ? `${graduates.length} graduated · ${failedCount} did not pass`
                : `${inTraining.length} in training`
            }
          />
          <Row
            label="Cohort pass rate"
            value={
              cohortPassRate != null
                ? `${cohortPassRate}% (${passedCount} passed · ${failedCount} failed)`
                : "—"
            }
          />
          {batch.description && (
            <div className="py-2 text-sm">
              <span className="text-on-surface-variant">
                Public description
              </span>
              <p className="mt-1 text-on-surface">{batch.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {scheme && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Assessment scheme</CardTitle>
            <span className="text-xs text-on-surface-variant">
              read-only — change via Edit batch
            </span>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {scheme.categories.map((category) => {
              const comps = scheme.components.filter(
                (c) => c.group === category.key,
              );
              const max = comps.reduce((s, c) => s + c.maxScore, 0);
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
                    <span className="ml-auto flex items-center font-mono text-xs text-on-surface-variant">
                      <span className="w-28 text-right">
                        {comps.length} assessment{comps.length === 1 ? "" : "s"}
                      </span>
                      <span className="w-20 text-right">max {max}</span>
                    </span>
                  </summary>
                  <div className="overflow-x-auto border-outline-variant/60 border-t">
                    <table className="w-full table-fixed text-left text-xs">
                      <colgroup>
                        <col />
                        <col className="w-14" />
                        <col className="w-14" />
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
                            Pass
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {comps.map((c) => (
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
                              {c.passing ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </CardContent>
        </Card>
      )}

      <BatchDetailClient
        batch={{
          id: batch.id,
          code: batch.code,
          label: batch.label,
          professor: batch.professor,
          professorId: batch.professorId,
          description: batch.description,
          logoUrl: batch.logo?.url ?? null,
          graduated: batch.graduated,
          graduationRequested: batch.graduationRequested,
          graduatedAtLabel: fmt(batch.graduatedAt),
        }}
        professors={professors}
        canManage={canManage}
        status={status}
        inTraining={inTraining}
        graduates={graduates}
        failedStudents={failedStudents}
        summary={summary}
      />
    </div>
  );
}
