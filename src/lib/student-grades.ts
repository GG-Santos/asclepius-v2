import type { Prisma } from "@prisma/client";

/**
 * One periodic-exam definition. Batches may override the default set below
 * via Batch.quizDefs (R12): positional qN keys keep stored granularGrades
 * compatible whatever the count; maxScore drives the SJE denominator.
 */
export type QuizDef = {
  key: string;
  label: string;
  maxScore: number;
  passing: number;
  topics?: string;
  /** Exam date (ISO yyyy-mm-dd), when the batch recorded one. */
  date?: string;
};

export const QUIZ_DEFS = [
  {
    key: "q1" as const,
    label: "Q1",
    maxScore: 40,
    passing: 20,
    topics:
      "Introduction to EMT, Roles and Responsibilities, Legal/Ethical Issues, Communication and Documentation (PCR)",
  },
  {
    key: "q2" as const,
    label: "Q2",
    maxScore: 60,
    passing: 30,
    topics:
      "Human Body Terms, Medical History and Baseline Vital Signs, Anatomy and Physiology, Basic Pharmacology",
  },
  {
    key: "q3" as const,
    label: "Q3",
    maxScore: 100,
    passing: 50,
    topics:
      "Medical Overview, Neurological Emergencies, Altered Mental Status, Cardiovascular and Respiratory Emergencies, Common Medical Emergencies",
  },
  {
    key: "q4" as const,
    label: "Q4",
    maxScore: 100,
    passing: 50,
    topics:
      "Acute Abdominal Emergencies, Endocrine and Hematologic Emergencies, Toxicology and Poisoning Emergencies",
  },
  {
    key: "q5" as const,
    label: "Q5",
    maxScore: 60,
    passing: 30,
    topics:
      "Psychiatric and Behavioral Emergencies, Obstetrics and Childbirth Emergencies, Pediatric Emergencies, Geriatric Emergencies",
  },
  {
    key: "q6" as const,
    label: "Q6",
    maxScore: 50,
    passing: 25,
    topics:
      "Trauma Overview, Trauma 1 — Hemorrhaging and Soft-Tissue Injuries, Face and Neck Emergencies, Environmental Emergencies",
  },
  {
    key: "q7" as const,
    label: "Q7",
    maxScore: 50,
    passing: 25,
    topics:
      "Trauma 2 — Head and Spine Emergencies, Chest Emergencies, Abdominal Emergencies, Orthopedic Emergencies",
  },
  {
    key: "q8" as const,
    label: "Q8",
    maxScore: 40,
    passing: 20,
    topics: "Airway and Oxygen Therapy",
  },
  {
    key: "q9" as const,
    label: "Q9",
    maxScore: 200,
    passing: 100,
    topics: "Patient Assessment for Medical and Trauma",
  },
  {
    key: "q10" as const,
    label: "Q10",
    maxScore: 100,
    passing: 50,
    topics: "Incident Command System and Ambulance Equipment",
  },
] as const;

/** Sum of all quiz max scores: 40+60+100+100+60+50+50+40+200+100 */
export const QUIZ_TOTAL_MAX = 800;

export const PRACTICAL_DEFS = [
  {
    key: "scoreFWE" as const,
    label: "Final Written Examination",
    maxScore: 1000,
    passing: 600,
  },
  {
    key: "scoreEP" as const,
    label: "Ambulance Equipment",
    maxScore: 100,
    passing: 75,
  },
  {
    key: "scorePAS" as const,
    label: "Patient Assessment — Medical and Trauma (Verbalization)",
    maxScore: 200,
    passing: 160,
  },
  {
    key: "scoreCCST" as const,
    label: "Critical Case Scenario (Trauma)",
    maxScore: 100,
    passing: 80,
  },
  {
    key: "scoreCCSM" as const,
    label: "Critical Case Scenario (Medical)",
    maxScore: 100,
    passing: 80,
  },
] as const;

export type QuizKey = (typeof QUIZ_DEFS)[number]["key"];
export type PracticalKey = (typeof PRACTICAL_DEFS)[number]["key"];
export type GranularGrades = Record<string, number | null>;

/**
 * Parse Batch.quizDefs. Returns null (→ legacy defaults) for anything
 * malformed: defs must be a non-empty array of { key:"qN", label, maxScore>0,
 * 0<=passing<=maxScore } with unique positional keys.
 */
export function parseBatchQuizDefs(
  json: Prisma.JsonValue | null | undefined,
): QuizDef[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const defs: QuizDef[] = [];
  const seen = new Set<string>();
  for (const entry of json) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return null;
    const e = entry as Record<string, unknown>;
    const key = typeof e.key === "string" ? e.key : "";
    const label = typeof e.label === "string" ? e.label : "";
    const maxScore = typeof e.maxScore === "number" ? e.maxScore : Number.NaN;
    const passing = typeof e.passing === "number" ? e.passing : Number.NaN;
    if (!/^q\d+$/.test(key) || seen.has(key)) return null;
    if (!label || !Number.isFinite(maxScore) || maxScore <= 0) return null;
    if (!Number.isFinite(passing) || passing < 0 || passing > maxScore)
      return null;
    seen.add(key);
    defs.push({
      key,
      label,
      maxScore,
      passing,
      topics: typeof e.topics === "string" ? e.topics : undefined,
      date: typeof e.date === "string" ? e.date : undefined,
    });
  }
  return defs;
}

/** The quiz definitions in force for a batch: its own, or the legacy set. */
export function quizDefsFor(
  batchQuizDefs: Prisma.JsonValue | null | undefined,
): QuizDef[] {
  return parseBatchQuizDefs(batchQuizDefs) ?? [...QUIZ_DEFS];
}

export function quizMaxTotal(defs: readonly QuizDef[]): number {
  return defs.reduce((sum, d) => sum + d.maxScore, 0);
}

export function parseGranularGrades(
  json: Prisma.JsonValue | null,
  defs: readonly QuizDef[] = QUIZ_DEFS,
): GranularGrades {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const obj = json as Record<string, unknown>;
  const result: GranularGrades = {};
  for (const def of defs) {
    const v = obj[def.key];
    if (typeof v === "number") result[def.key] = v;
    else if (v === null) result[def.key] = null;
  }
  return result;
}

export function computeQuizTotal(
  grades: GranularGrades,
  defs: readonly QuizDef[] = QUIZ_DEFS,
): {
  total: number;
  entered: number;
} {
  let total = 0;
  let entered = 0;
  for (const def of defs) {
    const v = grades[def.key];
    if (typeof v === "number") {
      total += v;
      entered += 1;
    }
  }
  return { total, entered };
}

/**
 * Convert the quiz raw total to the SJE percentage used on Graduate. The
 * denominator is the batch's max-sum (legacy q1–q10 = 800).
 */
export function quizToSjePct(
  grades: GranularGrades,
  defs: readonly QuizDef[] = QUIZ_DEFS,
): number | null {
  const { total, entered } = computeQuizTotal(grades, defs);
  if (entered === 0) return null;
  const max = quizMaxTotal(defs);
  if (max <= 0) return null;
  return Math.round((total / max) * 10000) / 100;
}

export function isQuizPassing(
  key: string,
  score: number,
  defs: readonly QuizDef[] = QUIZ_DEFS,
): boolean {
  const def = defs.find((d) => d.key === key);
  return def ? score >= def.passing : false;
}

export function isPracticalPassing(key: PracticalKey, score: number): boolean {
  const def = PRACTICAL_DEFS.find((d) => d.key === key);
  return def ? score >= def.passing : false;
}
