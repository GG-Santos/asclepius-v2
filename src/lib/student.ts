import type { Prisma } from "@prisma/client";
import { batchNumber } from "@/lib/graduate";
import { parseGranularGrades, quizToSjePct } from "@/lib/student-grades";

/** Raw practical exam scores stored on the Student model. */
export type StudentRawScores = {
  scoreFWE: number | null; // 0-1000
  scoreEP: number | null; // 0-100  (Ambulance Equipment)
  scorePAS: number | null; // 0-200  (Patient Assessment Verbalization)
  scoreCCST: number | null; // 0-100
  scoreCCSM: number | null; // 0-100
  granularGrades: Prisma.JsonValue | null; // Q1-Q10 raw quiz scores
};

/** Six percentage-based proficiency scores stored on the Graduate model. */
export type GraduateSixScores = {
  scoreFWE: number | null;
  scoreSJE: number | null;
  scoreEP: number | null;
  scorePAS: number | null;
  scoreCCST: number | null;
  scoreCCSM: number | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Convert student raw scores + quiz grades into the six graduate proficiency
 * scores, stored as already-WEIGHTED POINTS (each exam scaled by its weight so
 * the six sum to the 0–100 Total). This matches how imported graduate records
 * store their scores, so a promoted student is unit-consistent with legacy data.
 *
 * Conversion (raw → percent → weighted points):
 *   scoreFWE  → raw/1000 × 100 × 0.10   (1000-pt written exam, weight 10% → ≤10)
 *   scoreSJE  → quiz%      × 0.15        (Q1–Q10 → SJE %, weight 15% → ≤15)
 *   scoreEP   → raw(0-100) × 0.10        (Ambulance Equipment, weight 10% → ≤10)
 *   scorePAS  → raw/200 × 100 × 0.15     (200-pt verbalization, weight 15% → ≤15)
 *   scoreCCST → raw(0-100) × 0.25        (Trauma, weight 25% → ≤25)
 *   scoreCCSM → raw(0-100) × 0.25        (Medical, weight 25% → ≤25)
 */
export function rollupGraduateScores(
  student: StudentRawScores,
): GraduateSixScores {
  const grades = parseGranularGrades(student.granularGrades);
  const sjePct = quizToSjePct(grades);
  return {
    scoreFWE:
      student.scoreFWE !== null ? round2((student.scoreFWE / 1000) * 10) : null,
    scoreSJE: sjePct !== null ? round2(sjePct * 0.15) : null,
    scoreEP: student.scoreEP !== null ? round2(student.scoreEP * 0.1) : null,
    scorePAS:
      student.scorePAS !== null ? round2((student.scorePAS / 200) * 15) : null,
    scoreCCST:
      student.scoreCCST !== null ? round2(student.scoreCCST * 0.25) : null,
    scoreCCSM:
      student.scoreCCSM !== null ? round2(student.scoreCCSM * 0.25) : null,
  };
}

/**
 * Build a license number at graduation:
 *   A (WSL EMS) + 2-digit batch + "-" + YYMM(graduation) + 2-digit sequence.
 * e.g. batch 9, Aug 2024, seq 1 → "A09-240801".
 */
export function buildLcn(
  batchCode: string | null | undefined,
  gradDate: Date,
  sequence: number,
): string {
  const bb = String(batchNumber(batchCode) ?? 0).padStart(2, "0");
  const yy = String(gradDate.getFullYear()).slice(2);
  const mm = String(gradDate.getMonth() + 1).padStart(2, "0");
  const nn = String(sequence).padStart(2, "0");
  return `A${bb}-${yy}${mm}${nn}`;
}

/** Enrollment number for a new student: "S-YYYY-####". */
export function buildEnrollmentNo(year: number, sequence: number): string {
  return `S-${year}-${String(sequence).padStart(4, "0")}`;
}
