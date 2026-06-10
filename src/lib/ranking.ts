import { weightedAverage } from "@/lib/grading";
import type { GraduateSixScores, StudentRawScores } from "@/lib/student";
import {
  PRACTICAL_DEFS,
  parseGranularGrades,
  QUIZ_DEFS,
} from "@/lib/student-grades";

// Pure ranking logic, computed on read.
//  - Students: per-activity (Q1–Q10 + 5 practicals) score, pass/fail vs the
//    activity's own threshold, and rank within a cohort. Diagnostic only.
//  - Graduates: rank by weighted average — pass the batch's graduates for batch
//    rank, or all graduates for global rank.

const round1 = (n: number) => Math.round(n * 10) / 10;

export type ActivityKind = "quiz" | "practical";

export type ActivityResult = {
  key: string;
  label: string;
  kind: ActivityKind;
  score: number | null;
  maxScore: number;
  passing: number;
  pct: number | null; // score / maxScore × 100
  passed: boolean | null; // null when no score is recorded
};

export const ACTIVITY_KEYS: string[] = [
  ...QUIZ_DEFS.map((d) => d.key),
  ...PRACTICAL_DEFS.map((d) => d.key),
];

/** The 15 graded items for one student, each with pass/fail vs its threshold. */
export function studentActivities(s: StudentRawScores): ActivityResult[] {
  const grades = parseGranularGrades(s.granularGrades);
  const quizzes: ActivityResult[] = QUIZ_DEFS.map((d) => {
    const score = grades[d.key] ?? null;
    return {
      key: d.key,
      label: d.label,
      kind: "quiz",
      score,
      maxScore: d.maxScore,
      passing: d.passing,
      pct: score == null ? null : round1((score / d.maxScore) * 100),
      passed: score == null ? null : score >= d.passing,
    };
  });
  const practicals: ActivityResult[] = PRACTICAL_DEFS.map((d) => {
    const score = s[d.key] ?? null;
    return {
      key: d.key,
      label: d.label,
      kind: "practical",
      score,
      maxScore: d.maxScore,
      passing: d.passing,
      pct: score == null ? null : round1((score / d.maxScore) * 100),
      passed: score == null ? null : score >= d.passing,
    };
  });
  return [...quizzes, ...practicals];
}

/** How many of a student's recorded activities are passing (for a quick badge). */
export function activitiesPassedCount(activities: ActivityResult[]): {
  passed: number;
  recorded: number;
} {
  let passed = 0;
  let recorded = 0;
  for (const a of activities) {
    if (a.passed == null) continue;
    recorded++;
    if (a.passed) passed++;
  }
  return { passed, recorded };
}

/**
 * Rank a cohort on every activity (by score, high→low; only scored entries are
 * ranked). Returns studentId → (activityKey → rank-within-cohort).
 */
export function rankCohortByActivity(
  students: { id: string; activities: ActivityResult[] }[],
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const key of ACTIVITY_KEYS) {
    const scored = students
      .map((st) => ({
        id: st.id,
        score: st.activities.find((a) => a.key === key)?.score ?? null,
      }))
      .filter((x): x is { id: string; score: number } => x.score != null)
      .sort((a, b) => b.score - a.score);
    scored.forEach((x, i) => {
      let m = out.get(x.id);
      if (!m) {
        m = new Map();
        out.set(x.id, m);
      }
      m.set(key, i + 1);
    });
  }
  return out;
}

export type LeaderboardRow = {
  id: string;
  score: number;
  pct: number | null;
  passed: boolean | null;
  rank: number;
};

/** Ranked list of a cohort for a single activity (scored entries only). */
export function activityLeaderboard(
  students: { id: string; activities: ActivityResult[] }[],
  activityKey: string,
): LeaderboardRow[] {
  return students
    .map((st) => {
      const a = st.activities.find((x) => x.key === activityKey);
      return a && a.score != null
        ? { id: st.id, score: a.score, pct: a.pct, passed: a.passed }
        : null;
    })
    .filter(
      (
        x,
      ): x is {
        id: string;
        score: number;
        pct: number | null;
        passed: boolean | null;
      } => x != null,
    )
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, rank: i + 1 }));
}

export type RankResult = { weighted: number | null; rank: number | null };

/**
 * Rank graduates by weighted average (high→low). Pass a batch's graduates for
 * batch rank, or all graduates for global rank. Ungraded → rank null.
 */
export function rankGraduates(
  grads: { id: string; six: GraduateSixScores }[],
): Map<string, RankResult> {
  const out = new Map<string, RankResult>();
  for (const g of grads) {
    out.set(g.id, { weighted: weightedAverage(g.six), rank: null });
  }
  grads
    .map((g) => ({ id: g.id, weighted: weightedAverage(g.six) }))
    .filter((x): x is { id: string; weighted: number } => x.weighted != null)
    .sort((a, b) => b.weighted - a.weighted)
    .forEach((x, i) => {
      out.set(x.id, { weighted: x.weighted, rank: i + 1 });
    });
  return out;
}

export function medalFor(rank: number | null): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}
