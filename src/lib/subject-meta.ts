/**
 * Subject metadata + analytics shapes for the cohort-performance dashboard.
 * Kept free of server-only imports so client chart components can share the
 * types and the SUBJECTS table. The numbers are produced by
 * `getSubjectAnalytics` (server-only) in subject-analytics.ts.
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
  weight: number; // share of the final grade (sums to 1.0)
  max: number; // weight * 100 — the cap of this subject's weighted contribution
};

// Authoritative proficiency weighting (matches SCORE_ROWS / grading engine).
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

/** A subject's global standing across all scored graduates. */
export type GlobalSubject = SubjectMeta & {
  // Proficiency % (points earned ÷ max possible × 100) — comparable across
  // exams of different weights, so ranking by it is fair.
  avg: number | null;
  // Average points earned (≤ max) — the stacked-bar segment height.
  contribution: number | null;
};

export type BatchSubject = {
  avg: number | null; // proficiency % within the batch (point ÷ max × 100)
  contribution: number | null; // average points earned — this batch's segment
  belowGlobal: boolean; // struggle flag: proficiency % below the global average
};

export type BatchSubjectRow = {
  batch: string; // batch code
  batchNo: number | null;
  count: number; // graduates with ≥1 score
  total: number | null; // average Total Evaluation (0–100, sum of points)
  passRate: number | null; // % of batch with total ≥ 70
  subjects: Record<SubjectKey, BatchSubject>;
};

/** One scored graduate — for outlier / top-and-bottom callouts. */
export type GraduateRecord = {
  id: string;
  lcn: string;
  name: string;
  batch: string;
  batchNo: number | null;
  total: number; // Total Evaluation (sum of the points present)
  pct: Record<SubjectKey, number | null>; // proficiency % per subject
};

export type SubjectAnalytics = {
  graduateCount: number; // graduates with at least one score
  avgTotal: number | null; // mean Total Evaluation
  passRate: number | null; // % scoring ≥ 70
  global: GlobalSubject[]; // fixed SUBJECTS order — drives the stacked bars
  globalRanked: GlobalSubject[]; // sorted hardest → easiest (lowest % first)
  weakest: GlobalSubject | null;
  strongest: GlobalSubject | null;
  batches: BatchSubjectRow[]; // sorted by batch number
  graduates: GraduateRecord[]; // all scored graduates (for outlier analysis)
};
