import "server-only";
import {
  type GradingScheme,
  parseGradingScheme,
  scoreKeyForCategory,
} from "@/lib/assessment-scheme";
import { gradeStudentForBatch } from "@/lib/grading";
import {
  batchNumber,
  isLegacyBatch,
  isRecordsOnlyBatch,
  scoreTotal,
} from "@/lib/graduate";
import { prisma } from "@/lib/prisma";
import {
  type BatchInfo,
  type CohortRecord,
  type CredentialState,
  SUBJECTS,
  type SubjectAnalytics,
  type SubjectKey,
} from "@/lib/subject-meta";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Per-batch subject weights. Each batch's scheme decides how many points a
 * subject can contribute (Batch 8: EP 25, no PAS; Batch 11: FWE 83.34,
 * CCST/CCSM 8.33, nothing else). null = the batch does not assess the subject.
 * Batches without a scheme fall back to the standard weighting.
 */
function batchSubjectMax(
  scheme: GradingScheme | null,
): Record<SubjectKey, number | null> {
  if (!scheme) {
    return Object.fromEntries(SUBJECTS.map((s) => [s.key, s.max])) as Record<
      SubjectKey,
      number | null
    >;
  }
  const out = Object.fromEntries(SUBJECTS.map((s) => [s.key, null])) as Record<
    SubjectKey,
    number | null
  >;
  for (const category of scheme.categories) {
    const key = scoreKeyForCategory(category);
    if (key) out[key] = (out[key] ?? 0) + category.weight;
  }
  return out;
}

function credentialState(graduate: {
  status: string;
  expiresAt: Date | null;
}): CredentialState {
  if (graduate.status === "ARCHIVED") return "archived";
  if (graduate.expiresAt && graduate.expiresAt < new Date()) return "expired";
  return "active";
}

/**
 * Whole-cohort subject records, computed from STUDENT grades — the full
 * completed cohort, failed students included, not just the graduate registry.
 * Each member's per-subject proficiency % is their scheme-weighted points
 * divided by the batch's OWN weight for that subject, so batches with
 * non-standard schemes (8, 11) compare fairly. Graduates keep their official
 * certificate Total Evaluation; failed students use the scheme-computed total.
 * Aggregation/filtering happens in subject-meta.ts (client-safe) so dashboard
 * filters can recompute live. Legacy batches (no per-assessment grades on
 * file — Batch 5) are flagged: listed, never ranked.
 */
export async function getSubjectAnalytics(): Promise<SubjectAnalytics> {
  const allBatchRecords = await prisma.batch.findMany({
    where: { graduated: true },
    select: {
      code: true,
      label: true,
      gradingScheme: true,
      quizDefs: true,
    },
  });
  // Records-only batches (11, 16) are kept for record purposes — they never
  // enter analytics or rankings.
  const batchRecords = allBatchRecords.filter(
    (b) => !isRecordsOnlyBatch(b.code),
  );
  const codes = batchRecords.map((b) => b.code);
  const students = await prisma.student.findMany({
    where: {
      batchCode: { in: codes },
      status: { in: ["GRADUATED", "FAILED"] },
    },
    select: {
      id: true,
      name: true,
      batchCode: true,
      status: true,
      graduatedToLcn: true,
      scoreFWE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
      granularGrades: true,
      bonusPoints: true,
    },
  });
  const lcns = students
    .map((s) => s.graduatedToLcn)
    .filter((lcn): lcn is string => Boolean(lcn));
  const graduates = await prisma.graduate.findMany({
    where: { lcn: { in: lcns } },
    select: {
      lcn: true,
      status: true,
      expiresAt: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
      bonusPoints: true,
    },
  });
  const graduateByLcn = new Map(graduates.map((g) => [g.lcn, g]));

  const batchMeta = new Map(
    batchRecords.map((b) => {
      const scheme = parseGradingScheme(b.gradingScheme);
      return [
        b.code,
        {
          label: b.label,
          legacy: isLegacyBatch(b.code),
          quizDefs: b.quizDefs,
          max: batchSubjectMax(scheme),
          gradingScheme: b.gradingScheme,
        },
      ] as const;
    }),
  );

  const records: CohortRecord[] = [];
  for (const s of students) {
    const meta = s.batchCode ? batchMeta.get(s.batchCode) : undefined;
    if (!meta || !s.batchCode) continue;
    const failed = s.status === "FAILED";

    // Subject % from the student's own grade record, graded through the
    // batch scheme — real exam performance for graduates AND failed students.
    const grade = gradeStudentForBatch(s, {
      gradingScheme: meta.gradingScheme,
      quizDefs: meta.quizDefs,
    });
    const pct = {} as Record<SubjectKey, number | null>;
    for (const subject of SUBJECTS) {
      const points = grade.six[subject.key];
      const max = meta.max[subject.key];
      // Legacy rollups can yield NaN on empty records — treat as no score.
      pct[subject.key] =
        typeof points === "number" &&
        Number.isFinite(points) &&
        max != null &&
        max > 0
          ? round1((points / max) * 100)
          : null;
    }

    // Graduates keep the official certificate total; failed students take the
    // scheme-computed total (null when too incomplete to grade).
    const graduate = s.graduatedToLcn
      ? graduateByLcn.get(s.graduatedToLcn)
      : undefined;
    // Legacy batches carry no grade data — never surface a (zero) total.
    const total = meta.legacy
      ? null
      : graduate
        ? scoreTotal(graduate)
        : grade.weighted != null && Number.isFinite(grade.weighted)
          ? round1(grade.weighted)
          : null;

    records.push({
      id: s.id,
      lcn: s.graduatedToLcn ?? null,
      name: s.name ?? "—",
      batch: s.batchCode,
      batchNo: batchNumber(s.batchCode),
      failed,
      legacy: meta.legacy,
      credential: graduate ? credentialState(graduate) : null,
      total,
      pct,
    });
  }

  const batches: BatchInfo[] = [...batchMeta.entries()]
    .map(([code, meta]) => {
      const list = records.filter((r) => r.batch === code);
      const passed = list.filter((r) => !r.failed).length;
      return {
        batch: code,
        batchNo: batchNumber(code),
        label: meta.label,
        legacy: meta.legacy,
        count: list.length,
        passed,
        failed: list.length - passed,
        passRate: list.length ? round1((passed / list.length) * 100) : null,
      };
    })
    .filter((b) => b.count > 0)
    .sort((a, b) => (a.batchNo ?? 9999) - (b.batchNo ?? 9999));

  return { batches, records };
}
