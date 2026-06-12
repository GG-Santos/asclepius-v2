/**
 * Subject metadata, analytics shapes, and pure aggregation helpers for the
 * cohort-performance dashboard. Kept free of server-only imports so client
 * chart components can share the types and recompute aggregates when filters
 * change. The base records are produced by `getSubjectAnalytics`
 * (server-only) in subject-analytics.ts.
 */

export type SubjectKey =
  | "scoreFWE"
  | "scoreSJE"
  | "scoreEP"
  | "scorePAS"
  | "scoreCCST"
  | "scoreCCSM";

export type SubjectMeta = {
  key: SubjectKey;
  short: string;
  label: string;
  weight: number; // standard share of the final grade (sums to 1.0)
  max: number; // weight * 100 — the standard cap of this subject's points
};

// Standard proficiency weighting. Display columns only — analytics measure
// each batch against its OWN scheme weights (Batch 8 folds patient assessment
// into a 25% equipment category; Batch 11 is FWE-heavy with no quizzes).
export const SUBJECTS: SubjectMeta[] = [
  {
    key: "scoreFWE",
    short: "FWE",
    label: "Final Written",
    weight: 0.1,
    max: 10,
  },
  {
    key: "scoreSJE",
    short: "SJE",
    label: "Situational Judgement",
    weight: 0.15,
    max: 15,
  },
  {
    key: "scoreEP",
    short: "EP",
    label: "Equipment Proficiency",
    weight: 0.1,
    max: 10,
  },
  {
    key: "scorePAS",
    short: "PAS",
    label: "Patient Assessment",
    weight: 0.15,
    max: 15,
  },
  {
    key: "scoreCCST",
    short: "CCST",
    label: "Critical Case: Trauma",
    weight: 0.25,
    max: 25,
  },
  {
    key: "scoreCCSM",
    short: "CCSM",
    label: "Critical Case: Medical",
    weight: 0.25,
    max: 25,
  },
];

/** Credential standing of a graduate's license. Failed students have none. */
export type CredentialState = "active" | "expired" | "archived";
export type CredentialFilter = CredentialState | "all";

export type SubjectFilters = {
  includeFailed: boolean; // false = graduates only (default)
  credential: CredentialFilter; // graduate license standing — default "active"
};

export const DEFAULT_SUBJECT_FILTERS: SubjectFilters = {
  includeFailed: false,
  credential: "active",
};

/** One cohort member — graduates AND failed students. */
export type CohortRecord = {
  id: string;
  lcn: string | null; // null for students who did not graduate
  name: string;
  batch: string;
  batchNo: number | null;
  failed: boolean;
  legacy: boolean; // member of a legacy batch — excluded from rankings
  credential: CredentialState | null; // null for failed students
  total: number | null; // Total Evaluation (official for graduates)
  pct: Record<SubjectKey, number | null>; // proficiency % per subject
};

/** Per-batch identity + immutable cohort facts (filter-independent). */
export type BatchInfo = {
  batch: string; // batch code
  batchNo: number | null;
  label: string | null; // official label (e.g. "Armedsafe Batch 5 / ERA Batch 1")
  legacy: boolean; // no per-assessment grades on file — listed, never ranked
  count: number; // completed cohort size (passed + failed)
  passed: number;
  failed: number;
  passRate: number | null; // passed ÷ (passed + failed) × 100 — true cohort rate
};

/** A subject's standing across a set of cohort records. */
export type GlobalSubject = SubjectMeta & {
  // Mean proficiency % (each person's points ÷ their batch's max for the
  // subject × 100) — comparable across batches with different weightings.
  avg: number | null;
  scored: number; // people contributing to the average
};

export type BatchSubject = {
  avg: number | null; // mean proficiency % within the batch
  belowGlobal: boolean; // struggle flag: proficiency % below the global average
};

export type BatchSubjectRow = BatchInfo & {
  total: number | null; // mean Total Evaluation across the filtered members
  subjects: Record<SubjectKey, BatchSubject>;
};

export type SubjectAnalytics = {
  batches: BatchInfo[]; // sorted by batch number
  records: CohortRecord[]; // every completed student, unfiltered
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Apply the graduates/failed + credential filters to cohort records. */
export function filterCohort(
  records: CohortRecord[],
  filters: SubjectFilters,
): CohortRecord[] {
  return records.filter((r) => {
    if (r.failed) return filters.includeFailed;
    if (filters.credential === "all") return true;
    return r.credential === filters.credential;
  });
}

/** Per-subject averages over a record set (pass non-legacy records). */
export function globalSubjects(records: CohortRecord[]): GlobalSubject[] {
  return SUBJECTS.map((s) => {
    const values = records
      .map((r) => r.pct[s.key])
      .filter((v): v is number => v != null);
    const avg = mean(values);
    return {
      ...s,
      avg: avg == null ? null : round1(avg),
      scored: values.length,
    };
  });
}

export type SubjectStats = {
  avgTotal: number | null;
  global: GlobalSubject[];
  globalRanked: GlobalSubject[]; // hardest → easiest (lowest % first)
  weakest: GlobalSubject | null;
  strongest: GlobalSubject | null;
};

/** Headline stats over a record set (pass filtered, non-legacy records). */
export function subjectStats(records: CohortRecord[]): SubjectStats {
  const global = globalSubjects(records);
  const globalRanked = [...global].sort(
    (a, b) =>
      (a.avg ?? Number.POSITIVE_INFINITY) - (b.avg ?? Number.POSITIVE_INFINITY),
  );
  const withAvg = global.filter((g) => g.avg != null);
  const totals = records
    .map((r) => r.total)
    .filter((t): t is number => t != null);
  const avgTotal = mean(totals);
  return {
    avgTotal: avgTotal == null ? null : round1(avgTotal),
    global,
    globalRanked,
    weakest: withAvg.length
      ? withAvg.reduce((m, g) => ((g.avg ?? 0) < (m.avg ?? 0) ? g : m))
      : null,
    strongest: withAvg.length
      ? withAvg.reduce((m, g) => ((g.avg ?? 0) > (m.avg ?? 0) ? g : m))
      : null,
  };
}

/**
 * Batch rows for the heatmap: identity + cohort facts from BatchInfo, subject
 * averages and mean total from the FILTERED records of each batch.
 */
export function batchSubjectRows(
  batches: BatchInfo[],
  filtered: CohortRecord[],
  global: GlobalSubject[],
): BatchSubjectRow[] {
  const globalPct = new Map(global.map((g) => [g.key, g.avg]));
  return batches.map((info) => {
    const list = filtered.filter((r) => r.batch === info.batch);
    const subjects = {} as Record<SubjectKey, BatchSubject>;
    for (const s of SUBJECTS) {
      const values = list
        .map((r) => r.pct[s.key])
        .filter((v): v is number => v != null);
      const avg = mean(values);
      const gPct = globalPct.get(s.key) ?? null;
      subjects[s.key] = {
        avg: avg == null ? null : round1(avg),
        belowGlobal: avg != null && gPct != null && avg < gPct,
      };
    }
    const totals = list
      .map((r) => r.total)
      .filter((t): t is number => t != null);
    const total = mean(totals);
    return {
      ...info,
      total: total == null ? null : round1(total),
      subjects,
    };
  });
}
