import type { GraduateSixScores, StudentRawScores } from "@/lib/student";
import { rollupGraduateScores } from "@/lib/student";

// Graduation verdict = the Total Evaluation (sum of the six weighted points).
// A student passes at >= 70. Any missing component makes the result
// "incomplete" (we never fail someone on absent data). Pure logic, safe on
// server or client — computed on read, nothing persisted.

export const PASS_THRESHOLD = 70;

export const SCORE_WEIGHTS = [
  { key: "scoreFWE", short: "FWE", label: "Written Exam", weight: 0.1 },
  {
    key: "scoreSJE",
    short: "SJE",
    label: "Situational Judgement",
    weight: 0.15,
  },
  { key: "scoreEP", short: "EP", label: "Equipment Proficiency", weight: 0.1 },
  { key: "scorePAS", short: "PAS", label: "Patient Assessment", weight: 0.15 },
  {
    key: "scoreCCST",
    short: "CCST",
    label: "Critical Case: Trauma",
    weight: 0.25,
  },
  {
    key: "scoreCCSM",
    short: "CCSM",
    label: "Critical Case: Medical",
    weight: 0.25,
  },
] as const satisfies ReadonlyArray<{
  key: keyof GraduateSixScores;
  short: string;
  label: string;
  weight: number;
}>;

export type Verdict = "pass" | "fail" | "incomplete";

export const VERDICT_LABEL: Record<Verdict, string> = {
  pass: "Passed",
  fail: "Did not pass",
  incomplete: "Incomplete",
};

export const VERDICT_TONE: Record<Verdict, "success" | "critical" | "warning"> =
  {
    pass: "success",
    fail: "critical",
    incomplete: "warning",
  };

export type GradeResult = {
  six: GraduateSixScores;
  weighted: number | null; // 0–100, null when any component is missing
  verdict: Verdict;
  missing: string[]; // short codes of absent components
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Total Evaluation (0–100). The six scores are already-weighted points (FWE/EP
 * ≤10, SJE/PAS ≤15, CCST/CCSM ≤25) that sum to 100, so the total is their sum.
 * null if any component is missing (we never grade on incomplete data).
 */
export function weightedAverage(six: GraduateSixScores): number | null {
  let sum = 0;
  for (const w of SCORE_WEIGHTS) {
    const v = six[w.key];
    if (v == null) return null;
    sum += v;
  }
  return round2(sum);
}

/** Grade from the six already-percentage scores (Graduate model shape). */
export function gradeFromSix(six: GraduateSixScores): GradeResult {
  const missing = SCORE_WEIGHTS.filter((w) => six[w.key] == null).map(
    (w) => w.short,
  );
  const weighted = weightedAverage(six);
  const verdict: Verdict =
    weighted == null
      ? "incomplete"
      : weighted >= PASS_THRESHOLD
        ? "pass"
        : "fail";
  return { six, weighted, verdict, missing };
}

/** Grade a Student from raw scores (converts via rollupGraduateScores). */
export function gradeStudent(student: StudentRawScores): GradeResult {
  return gradeFromSix(rollupGraduateScores(student));
}

export type BatchGrades = {
  total: number;
  graded: number; // pass + fail (excludes incomplete)
  passed: number;
  failed: number;
  incomplete: number;
  passRate: number | null; // % of graded that passed
  averageWeighted: number | null; // mean weighted score across graded
};

/** Aggregate a batch's grade results into headline counts + pass rate. */
export function rollupBatch(results: GradeResult[]): BatchGrades {
  let passed = 0;
  let failed = 0;
  let incomplete = 0;
  let sum = 0;
  let graded = 0;
  for (const r of results) {
    if (r.verdict === "incomplete" || r.weighted == null) {
      incomplete++;
      continue;
    }
    graded++;
    sum += r.weighted;
    if (r.verdict === "pass") passed++;
    else failed++;
  }
  return {
    total: results.length,
    graded,
    passed,
    failed,
    incomplete,
    passRate: graded > 0 ? round2((passed / graded) * 100) : null,
    averageWeighted: graded > 0 ? round2(sum / graded) : null,
  };
}
