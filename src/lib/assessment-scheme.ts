// Per-batch assessment schemes. A scheme is category-first: categories own a
// percentage weight and contain assessments. Raw scores are pooled inside each
// category (sum ÷ summed max), then category contributions are summed to 100%.
import type { Prisma } from "@prisma/client";
import type { GraduateSixScores } from "@/lib/student";

export type CanonicalGroup = "FWE" | "SJE" | "EP" | "PAS" | "CCST" | "CCSM";

export const CANONICAL_GROUPS: CanonicalGroup[] = [
  "FWE",
  "SJE",
  "EP",
  "PAS",
  "CCST",
  "CCSM",
];

/** Standard category weights, used by the official six-category template. */
export const GROUP_WEIGHTS: Record<CanonicalGroup, number> = {
  FWE: 10,
  SJE: 15,
  EP: 10,
  PAS: 15,
  CCST: 25,
  CCSM: 25,
};

export const GROUP_LABELS: Record<CanonicalGroup, string> = {
  FWE: "Final Written Examination",
  SJE: "Situational Judgement Examination",
  EP: "Equipment Proficiency",
  PAS: "Patient Assessment Skills",
  CCST: "Critical Case: Trauma",
  CCSM: "Critical Case: Medical",
};

export type SchemeAssessment = {
  key: string;
  label: string;
  maxScore: number;
  /** DISPLAY-ONLY pass mark — never affects the verdict. */
  passing?: number;
  /** Exam date (ISO yyyy-mm-dd). */
  date?: string;
};

export type SchemeCategory = {
  key: string;
  label: string;
  /** Weighted points this category contributes. All categories must total 100. */
  weight: number;
  assessments: SchemeAssessment[];
  /**
   * Hidden compatibility mapping for the fixed Graduate.score* columns.
   * Admins configure categories; this only preserves certificate/ranking output.
   */
  legacyGroup?: CanonicalGroup;
};

export type SchemeComponent = SchemeAssessment & {
  /** Category key. Kept for old call sites and imported old JSON. */
  group: string;
  /** Same as group for normalized schemes. */
  categoryKey?: string;
  legacyGroup?: CanonicalGroup;
};

export type GradingScheme = {
  mode: "category-average" | "weighted-six" | "total-points";
  categories: SchemeCategory[];
  /** Flattened assessments, derived from categories. */
  components: SchemeComponent[];
  /** total-points mode: pass when raw total + bonus >= passingTotal. */
  passingTotal?: number;
  /** Missing assessment scores count as 0 vs block the verdict. */
  missingAsZero?: boolean;
};

export type SchemeTemplate = {
  id: string;
  label: string;
  description: string;
  batchCodes?: string[];
  scheme: GradingScheme;
};

const KEY_RE = /^[A-Za-z][A-Za-z0-9-]*$/;
const WEIGHT_TOLERANCE = 0.05;

const SCORE_KEY_BY_GROUP: Record<CanonicalGroup, keyof GraduateSixScores> = {
  FWE: "scoreFWE",
  SJE: "scoreSJE",
  EP: "scoreEP",
  PAS: "scorePAS",
  CCST: "scoreCCST",
  CCSM: "scoreCCSM",
};

function isCanonicalGroup(value: unknown): value is CanonicalGroup {
  return (
    typeof value === "string" &&
    CANONICAL_GROUPS.includes(value as CanonicalGroup)
  );
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function cleanKey(input: string, fallback: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const key = /^[a-z]/.test(base) ? base : fallback;
  return KEY_RE.test(key) ? key : fallback;
}

function cloneAssessment(a: SchemeAssessment): SchemeAssessment {
  return {
    key: a.key,
    label: a.label,
    maxScore: a.maxScore,
    ...(a.passing !== undefined ? { passing: a.passing } : {}),
    ...(a.date ? { date: a.date } : {}),
  };
}

function flattenCategories(categories: SchemeCategory[]): SchemeComponent[] {
  return categories.flatMap((category) =>
    category.assessments.map((assessment) => ({
      ...cloneAssessment(assessment),
      group: category.key,
      categoryKey: category.key,
      legacyGroup: category.legacyGroup,
    })),
  );
}

export function buildCategoryScheme(
  categories: SchemeCategory[],
  options: {
    mode?: GradingScheme["mode"];
    passingTotal?: number;
    missingAsZero?: boolean;
  } = {},
): GradingScheme {
  const normalized = categories.map((category) => ({
    key: category.key,
    label: category.label,
    weight: category.weight,
    legacyGroup:
      category.legacyGroup ??
      (isCanonicalGroup(category.key) ? category.key : undefined),
    assessments: category.assessments.map(cloneAssessment),
  }));
  return {
    mode: options.mode ?? "category-average",
    categories: normalized,
    components: flattenCategories(normalized),
    ...(options.passingTotal !== undefined
      ? { passingTotal: options.passingTotal }
      : {}),
    missingAsZero: options.missingAsZero === true,
  };
}

function assessment(
  key: string,
  label: string,
  maxScore: number,
  passing?: number,
  date?: string,
): SchemeAssessment {
  return {
    key,
    label,
    maxScore,
    ...(passing !== undefined ? { passing } : {}),
    ...(date ? { date } : {}),
  };
}

function quizzes(
  maxes: number[],
  passings: number[],
  dates?: string[],
): SchemeAssessment[] {
  return maxes.map((maxScore, index) =>
    assessment(
      `q${index + 1}`,
      `Q${index + 1}`,
      maxScore,
      passings[index],
      dates?.[index],
    ),
  );
}

function category(
  key: CanonicalGroup,
  weight: number,
  assessments: SchemeAssessment[],
  label = GROUP_LABELS[key],
): SchemeCategory {
  return { key, label, weight, legacyGroup: key, assessments };
}

function officialSixCategoryScheme(args: {
  quizMaxes: number[];
  quizPassings: number[];
  quizDates?: string[];
  fwe: SchemeAssessment[];
  ep: SchemeAssessment[];
  pas: SchemeAssessment[];
  ccst: SchemeAssessment[];
  ccsm: SchemeAssessment[];
  missingAsZero?: boolean;
}): GradingScheme {
  return buildCategoryScheme(
    [
      category("FWE", 10, args.fwe),
      category(
        "SJE",
        15,
        quizzes(args.quizMaxes, args.quizPassings, args.quizDates),
      ),
      category("EP", 10, args.ep),
      category("PAS", 15, args.pas),
      category("CCST", 25, args.ccst),
      category("CCSM", 25, args.ccsm),
    ],
    { missingAsZero: args.missingAsZero },
  );
}

export const ASSESSMENT_SCHEME_TEMPLATES: SchemeTemplate[] = [
  {
    id: "standard-six-category",
    label: "Standard six-category EMT",
    description:
      "FWE 10%, SJE quizzes 15%, equipment 10%, patient assessment 15%, trauma 25%, medical 25%.",
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 60, 100, 100, 60, 40, 100, 200],
      quizPassings: [20, 30, 50, 50, 30, 20, 50, 120],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 210),
        assessment("fwe-700", "FWE (700)", 700, 490),
      ],
      ep: [assessment("eqe", "Equipment", 100, 80)],
      pas: [assessment("pa", "Patient Assessment", 200, 150)],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80)],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80)],
    }),
  },
  {
    id: "batch-08-official",
    label: "Batch 8 official special",
    description:
      "Five categories: quizzes, FWE split scores, one combined equipment/patient-assessment exam (25%), trauma, and medical.",
    batchCodes: ["BATCH-08"],
    scheme: buildCategoryScheme(
      [
        category("FWE", 10, [
          assessment("fwe-300", "FWE (300)", 300, 150, "2023-08-06"),
          assessment("fwe-700", "FWE (700)", 700, 350, "2023-08-06"),
        ]),
        category(
          "SJE",
          15,
          quizzes(
            [40, 60, 100, 100, 60, 50, 50, 40, 200, 100],
            [20, 30, 50, 50, 30, 25, 25, 20, 100, 50],
            [
              "2023-05-14",
              "2023-05-21",
              "2023-05-28",
              "2023-06-04",
              "2023-06-11",
              "2023-06-18",
              "2023-06-25",
              "2023-07-09",
              "2023-07-16",
              "2023-07-23",
            ],
          ),
        ),
        category(
          "EP",
          25,
          [assessment("eqe", "Equipment Examination", 100, 80, "2023-08-13")],
          "Equipment / Patient Assessment",
        ),
        category("CCST", 25, [
          assessment("cct", "Critical Case Trauma", 100, 80, "2023-08-20"),
        ]),
        category("CCSM", 25, [
          assessment("ccm", "Critical Case Medical", 100, 80, "2023-08-27"),
        ]),
      ],
      { missingAsZero: true },
    ),
  },
  {
    id: "batch-09-official",
    label: "Batch 9 official",
    description: "Standard six-category structure with ten SJE quizzes.",
    batchCodes: ["BATCH-09"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 60, 100, 100, 60, 50, 50, 40, 200, 100],
      quizPassings: [20, 30, 50, 50, 30, 25, 25, 20, 100, 50],
      quizDates: [
        "2024-04-14",
        "2024-04-21",
        "2024-04-28",
        "2024-05-05",
        "2024-05-12",
        "2024-05-19",
        "2024-05-26",
        "2024-06-09",
        "2024-06-16",
        "2024-06-30",
      ],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 150, "2024-07-07"),
        assessment("fwe-700", "FWE (700)", 700, 350, "2024-07-07"),
      ],
      ep: [assessment("eqe", "Equipment", 100, 75, "2024-07-14")],
      pas: [assessment("pa", "Patient Assessment", 200, 160, "2024-07-21")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2024-07-28")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2024-07-28")],
      missingAsZero: true,
    }),
  },
  {
    id: "batch-10-official",
    label: "Batch 10 official",
    description: "Standard six-category structure with twelve SJE quizzes.",
    batchCodes: ["BATCH-10"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 90, 100, 100, 60, 50, 50, 25, 40, 100, 200, 100],
      quizPassings: [20, 45, 50, 50, 30, 25, 25, 15, 20, 50, 120, 50],
      quizDates: [
        "2024-08-11",
        "2024-08-18",
        "2024-08-24",
        "2024-08-25",
        "2024-08-31",
        "2024-09-01",
        "2024-09-07",
        "2024-09-08",
        "2024-09-14",
        "2024-09-15",
        "2024-10-05",
        "2024-10-06",
      ],
      fwe: [assessment("fwe", "Final Written", 1000, 700, "2024-10-12")],
      ep: [assessment("eqe", "Equipment", 100, 80, "2024-10-13")],
      pas: [assessment("pa", "Patient Assessment", 200, 160, "2024-10-13")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2024-10-19")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2024-10-20")],
      missingAsZero: true,
    }),
  },
  {
    id: "batch-11-official",
    label: "Batch 11 official special",
    description:
      "Special structure: FWE 83.34%, practical medical 8.33%, practical trauma 8.33%; no quizzes.",
    batchCodes: ["BATCH-11"],
    scheme: buildCategoryScheme(
      [
        category("FWE", 83.34, [
          assessment("fwe-300", "FWE (300)", 300, 210),
          assessment("fwe-700", "FWE (700)", 700, 490),
        ]),
        category(
          "CCSM",
          8.33,
          [assessment("medical", "Practical Medical", 100, 70)],
          "Practical Exam: Medical",
        ),
        category(
          "CCST",
          8.33,
          [assessment("trauma", "Practical Trauma", 100, 70)],
          "Practical Exam: Trauma",
        ),
      ],
      { missingAsZero: true },
    ),
  },
  {
    id: "batch-12-official",
    label: "Batch 12 official",
    description:
      "Standard six-category structure with ten SJE quizzes and 300-point patient assessment.",
    batchCodes: ["BATCH-12"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 35, 125, 100, 60, 50, 50, 40, 40, 200],
      quizPassings: [20, 18, 65, 50, 30, 25, 25, 20, 20, 120],
      quizDates: [
        "2025-05-10",
        "2025-05-11",
        "2025-05-17",
        "2025-05-18",
        "2025-05-24",
        "2025-05-25",
        "2025-05-31",
        "2025-06-07",
        "2025-06-15",
        "2025-06-15",
      ],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 210, "2025-06-21"),
        assessment("fwe-700", "FWE (700)", 700, 490, "2025-06-21"),
      ],
      ep: [assessment("eqe", "Equipment", 100, 80, "2025-06-22")],
      pas: [assessment("pa", "Patient Assessment", 300, 240, "2025-06-28")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2025-06-29")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2025-06-29")],
      missingAsZero: true,
    }),
  },
  {
    id: "batch-15-official",
    label: "Batch 15 official",
    description:
      "Standard six-category structure with eight SJE quizzes and 200-point equipment/patient assessments.",
    batchCodes: ["BATCH-15"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 60, 100, 100, 60, 40, 100, 200],
      quizPassings: [20, 30, 50, 50, 30, 20, 50, 100],
      quizDates: [
        "2025-10-26",
        "2025-11-08",
        "2025-11-22",
        "2025-11-22",
        "2025-11-23",
        "2025-11-29",
        "2025-11-30",
        "2025-12-13",
      ],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 210, "2025-12-14"),
        assessment("fwe-700", "FWE (700)", 700, 490, "2025-12-14"),
      ],
      ep: [assessment("eqe", "Equipment", 200, 100, "2025-12-20")],
      pas: [assessment("pa", "Patient Assessment", 200, 120, "2025-12-20")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2025-12-21")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2025-12-21")],
      missingAsZero: true,
    }),
  },
  {
    id: "batch-16-official",
    label: "Batch 16 official",
    description: "Standard six-category structure with seven SJE quizzes.",
    batchCodes: ["BATCH-16"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 35, 125, 160, 60, 100, 200],
      quizPassings: [20, 18, 65, 80, 30, 50, 120],
      quizDates: [
        "2025-12-04",
        "2025-12-05",
        "2025-12-09",
        "2025-12-10",
        "2025-12-11",
        "2025-12-12",
        "2025-12-17",
      ],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 210, "2025-12-19"),
        assessment("fwe-700", "FWE (700)", 700, 490, "2025-12-19"),
      ],
      ep: [assessment("eqe", "Equipment", 100, 65, "2025-12-22")],
      pas: [assessment("pa", "Patient Assessment", 200, 130, "2025-12-22")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2025-12-23")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2025-12-23")],
      missingAsZero: true,
    }),
  },
  {
    id: "batch-17-official",
    label: "Batch 17 official",
    description:
      "Current in-training structure with eight SJE quizzes and corrected FWE split scores.",
    batchCodes: ["BATCH-17"],
    scheme: officialSixCategoryScheme({
      quizMaxes: [40, 60, 100, 100, 60, 40, 100, 200],
      quizPassings: [20, 30, 50, 50, 30, 20, 50, 120],
      quizDates: [
        "2026-05-03",
        "2026-05-09",
        "2026-05-10",
        "2026-05-10",
        "2026-05-16",
        "2026-05-17",
        "2026-05-23",
        "2026-05-31",
      ],
      fwe: [
        assessment("fwe-300", "FWE (300)", 300, 210, "2026-06-06"),
        assessment("fwe-700", "FWE (700)", 700, 490, "2026-06-06"),
      ],
      ep: [assessment("eqe", "Equipment", 100, 80, "2026-06-07")],
      pas: [assessment("pa", "Patient Assessment", 200, 150, "2026-06-13")],
      ccst: [assessment("cct", "Critical Case Trauma", 100, 80, "2026-06-14")],
      ccsm: [assessment("ccm", "Critical Case Medical", 100, 80, "2026-06-14")],
      missingAsZero: false,
    }),
  },
];

export function officialTemplateForBatchCode(
  batchCode?: string | null,
): SchemeTemplate | null {
  if (!batchCode) return null;
  return (
    ASSESSMENT_SCHEME_TEMPLATES.find((template) =>
      template.batchCodes?.includes(batchCode),
    ) ?? null
  );
}

export function isLegacyGradeBookBatch(batchCode?: string | null): boolean {
  return batchCode === "BATCH-05";
}

function normalizeOldComponents(
  mode: GradingScheme["mode"],
  components: SchemeComponent[],
  missingAsZero: boolean,
  passingTotal?: number,
): GradingScheme | null {
  const groups = new Map<string, SchemeCategory>();
  for (const component of components) {
    const legacyGroup = isCanonicalGroup(component.group)
      ? component.group
      : component.legacyGroup;
    const key = component.group;
    const current =
      groups.get(key) ??
      ({
        key,
        label: legacyGroup ? GROUP_LABELS[legacyGroup] : component.group,
        weight: legacyGroup ? GROUP_WEIGHTS[legacyGroup] : 0,
        legacyGroup,
        assessments: [],
      } satisfies SchemeCategory);
    current.assessments.push({
      key: component.key,
      label: component.label,
      maxScore: component.maxScore,
      ...(component.passing !== undefined
        ? { passing: component.passing }
        : {}),
      ...(component.date ? { date: component.date } : {}),
    });
    groups.set(key, current);
  }

  const categories = [...groups.values()];
  const weightSum = categories.reduce(
    (sum, category) => sum + category.weight,
    0,
  );
  if (weightSum > 0 && Math.abs(weightSum - 100) > WEIGHT_TOLERANCE) {
    for (const category of categories) {
      category.weight = round2((category.weight / weightSum) * 100);
    }
    const drift = round2(
      100 - categories.reduce((sum, category) => sum + category.weight, 0),
    );
    if (categories[0])
      categories[0].weight = round2(categories[0].weight + drift);
  }

  if (categories.some((category) => category.weight <= 0)) return null;
  return buildCategoryScheme(categories, {
    mode,
    passingTotal,
    missingAsZero,
  });
}

export function buildLegacyComponentScheme(
  components: SchemeComponent[],
  options: {
    mode?: GradingScheme["mode"];
    passingTotal?: number;
    missingAsZero?: boolean;
  } = {},
): GradingScheme {
  const scheme = normalizeOldComponents(
    options.mode ?? "category-average",
    components,
    options.missingAsZero === true,
    options.passingTotal,
  );
  if (!scheme) {
    throw new Error("Invalid legacy component scheme.");
  }
  return scheme;
}

function parseAssessment(entry: unknown): SchemeAssessment | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const e = entry as Record<string, unknown>;
  const key = typeof e.key === "string" ? e.key : "";
  const label = typeof e.label === "string" ? e.label.trim() : "";
  const maxScore = typeof e.maxScore === "number" ? e.maxScore : Number.NaN;
  if (!KEY_RE.test(key) || !label) return null;
  if (!Number.isFinite(maxScore) || maxScore <= 0) return null;
  const passing = typeof e.passing === "number" ? e.passing : undefined;
  if (passing !== undefined && (passing < 0 || passing > maxScore)) return null;
  return {
    key,
    label,
    maxScore,
    ...(passing !== undefined ? { passing } : {}),
    ...(typeof e.date === "string" && e.date ? { date: e.date } : {}),
  };
}

/**
 * Parse + validate a persisted scheme. Returns null for malformed input so
 * callers fall back to legacy behavior, never half-apply.
 */
export function parseGradingScheme(
  json: Prisma.JsonValue | null | undefined,
): GradingScheme | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const mode = o.mode;
  if (
    mode !== "category-average" &&
    mode !== "weighted-six" &&
    mode !== "total-points"
  ) {
    return null;
  }

  const categories: SchemeCategory[] = [];
  if (Array.isArray(o.categories) && o.categories.length > 0) {
    const seenCategories = new Set<string>();
    const seenAssessments = new Set<string>();
    for (const entry of o.categories) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        return null;
      const e = entry as Record<string, unknown>;
      const key = typeof e.key === "string" ? e.key : "";
      const label = typeof e.label === "string" ? e.label.trim() : "";
      const weight = typeof e.weight === "number" ? e.weight : Number.NaN;
      if (!KEY_RE.test(key) || seenCategories.has(key)) return null;
      if (!label || !Number.isFinite(weight) || weight <= 0) return null;
      if (!Array.isArray(e.assessments) || e.assessments.length === 0)
        return null;
      const assessments: SchemeAssessment[] = [];
      for (const rawAssessment of e.assessments) {
        const parsed = parseAssessment(rawAssessment);
        if (!parsed || seenAssessments.has(parsed.key)) return null;
        seenAssessments.add(parsed.key);
        assessments.push(parsed);
      }
      const legacyGroup = isCanonicalGroup(e.legacyGroup)
        ? e.legacyGroup
        : isCanonicalGroup(key)
          ? key
          : undefined;
      seenCategories.add(key);
      categories.push({
        key,
        label,
        weight,
        ...(legacyGroup ? { legacyGroup } : {}),
        assessments,
      });
    }
  } else if (Array.isArray(o.components) && o.components.length > 0) {
    const components: SchemeComponent[] = [];
    const seen = new Set<string>();
    for (const entry of o.components) {
      const parsed = parseAssessment(entry);
      if (!parsed) return null;
      const e = entry as Record<string, unknown>;
      const group =
        typeof e.group === "string"
          ? e.group
          : typeof e.categoryKey === "string"
            ? e.categoryKey
            : "";
      if (!KEY_RE.test(parsed.key) || seen.has(parsed.key)) return null;
      if (!group) return null;
      seen.add(parsed.key);
      components.push({
        ...parsed,
        group,
        categoryKey: group,
        ...(isCanonicalGroup(e.legacyGroup)
          ? { legacyGroup: e.legacyGroup }
          : isCanonicalGroup(group)
            ? { legacyGroup: group }
            : {}),
      });
    }
    const totalMax = components.reduce((sum, c) => sum + c.maxScore, 0);
    let passingTotal: number | undefined;
    if (mode === "total-points") {
      passingTotal =
        typeof o.passingTotal === "number" ? o.passingTotal : Number.NaN;
      if (
        !Number.isFinite(passingTotal) ||
        passingTotal <= 0 ||
        passingTotal > totalMax
      ) {
        return null;
      }
    }
    return normalizeOldComponents(
      mode,
      components,
      o.missingAsZero === true,
      passingTotal,
    );
  } else {
    return null;
  }

  const weightTotal = categories.reduce(
    (sum, category) => sum + category.weight,
    0,
  );
  if (Math.abs(weightTotal - 100) > WEIGHT_TOLERANCE) return null;

  const totalMax = categories.reduce(
    (sum, category) =>
      sum +
      category.assessments.reduce(
        (categorySum, assessment) => categorySum + assessment.maxScore,
        0,
      ),
    0,
  );
  let passingTotal: number | undefined;
  if (mode === "total-points") {
    passingTotal =
      typeof o.passingTotal === "number" ? o.passingTotal : Number.NaN;
    if (
      !Number.isFinite(passingTotal) ||
      passingTotal <= 0 ||
      passingTotal > totalMax
    ) {
      return null;
    }
  }

  return buildCategoryScheme(categories, {
    mode,
    passingTotal,
    missingAsZero: o.missingAsZero === true,
  });
}

export function schemeTotalMax(scheme: GradingScheme): number {
  return scheme.components.reduce((s, c) => s + c.maxScore, 0);
}

/** Assessment scores parsed from Student.granularGrades for this scheme. */
export function parseSchemeScores(
  json: Prisma.JsonValue | null,
  scheme: GradingScheme,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const obj =
    json && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  for (const c of scheme.components) {
    const v = obj[c.key];
    out[c.key] = typeof v === "number" ? v : null;
  }
  return out;
}

export type CategoryRollup = {
  key: string;
  label: string;
  weight: number;
  legacyGroup?: CanonicalGroup;
  sum: number;
  max: number;
  entered: number;
  total: number;
  complete: boolean;
  averagePercent: number | null;
  contribution: number | null;
};

function categoryRollups(
  scheme: GradingScheme,
  scores: Record<string, number | null>,
): Record<string, CategoryRollup> {
  const groups: Record<string, CategoryRollup> = {};
  for (const category of scheme.categories) {
    let rawSum = 0;
    let rawMax = 0;
    let enteredMax = 0;
    let entered = 0;
    let complete = true;

    for (const assessment of category.assessments) {
      rawMax += assessment.maxScore;
      const v = scores[assessment.key];
      if (typeof v === "number") {
        rawSum += v;
        enteredMax += assessment.maxScore;
        entered += 1;
      } else if (!scheme.missingAsZero) {
        complete = false;
      }
    }

    const total = category.assessments.length;
    complete = complete && (scheme.missingAsZero || entered === total);
    // Raw points are POOLED within the category (sum ÷ summed max), matching
    // the official grade sheet — e.g. a 216+652 FWE split is 868/1000 = 86.8%,
    // and the quiz group is the raw quiz total over the combined max. Partial
    // entry (display only) pools over the entered assessments' max.
    const pooledMax = complete ? rawMax : enteredMax;
    const averagePercent =
      total > 0 && (complete || entered > 0) && pooledMax > 0
        ? round2((rawSum / pooledMax) * 100)
        : null;
    const contribution =
      complete && averagePercent !== null
        ? round2((averagePercent / 100) * category.weight)
        : null;

    groups[category.key] = {
      key: category.key,
      label: category.label,
      weight: category.weight,
      ...(category.legacyGroup ? { legacyGroup: category.legacyGroup } : {}),
      sum: round2(rawSum),
      max: rawMax,
      entered: scheme.missingAsZero ? total : entered,
      total,
      complete,
      averagePercent,
      contribution,
    };
  }
  return groups;
}

export type SchemeResult = {
  mode: GradingScheme["mode"];
  /** Raw point total in total-points mode; weighted 0-100 otherwise. */
  total: number | null;
  totalMax: number;
  /** Weighted category total, always on a 0-100 scale when complete. */
  weightedTotal: number | null;
  passingTotal: number | null;
  bonusApplied: number;
  verdict: "pass" | "fail" | "incomplete";
  /** Fixed certificate score columns for registry compatibility. */
  six: GraduateSixScores;
  groups: Record<string, CategoryRollup>;
};

export function scoreKeyForCategory(
  category: Pick<SchemeCategory, "key" | "legacyGroup">,
): keyof GraduateSixScores | null {
  const group =
    category.legacyGroup ??
    (isCanonicalGroup(category.key) ? category.key : null);
  return group ? SCORE_KEY_BY_GROUP[group] : null;
}

/**
 * Convert a scheme into certificate proficiency rows. This keeps the admin UI
 * category-first while preserving the existing Graduate.score* storage.
 */
export function proficiencyRowsFromScheme(scheme: GradingScheme): {
  key: keyof GraduateSixScores;
  weight: string;
  label: string;
}[] {
  const rows: {
    key: keyof GraduateSixScores;
    weight: string;
    label: string;
  }[] = [];
  const seen = new Set<keyof GraduateSixScores>();
  for (const category of scheme.categories) {
    const key = scoreKeyForCategory(category);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      key,
      weight: `${round2(category.weight)}%`,
      label: category.label,
    });
  }
  return rows;
}

/**
 * Grade a student under a scheme. In category mode, raw scores are pooled
 * inside each category (sum ÷ summed max, matching the official grade sheet);
 * category weighted contributions are summed to 100.
 */
export function computeSchemeResult(
  scheme: GradingScheme,
  scores: Record<string, number | null>,
  bonusPoints: number | null | undefined,
): SchemeResult {
  const groups = categoryRollups(scheme, scores);
  const totalMax = schemeTotalMax(scheme);
  const bonus = typeof bonusPoints === "number" ? bonusPoints : 0;
  const anyEntered = Object.values(groups).some((g) => g.entered > 0);
  let bonusApplied = 0;

  // Bonus (or signed certificate reconciliation) is its OWN line in Total
  // Evaluation points: categories show true exam performance, and the bonus
  // is added on top — never folded into SJE or any other category.
  if (scheme.mode !== "total-points" && bonus !== 0 && anyEntered) {
    bonusApplied = bonus;
  }

  const incomplete =
    !anyEntered || Object.values(groups).some((group) => !group.complete);
  const weighted = incomplete
    ? null
    : round2(
        Object.values(groups).reduce(
          (sum, group) => sum + (group.contribution ?? 0),
          0,
        ) + bonusApplied,
      );

  const six: GraduateSixScores = {
    scoreFWE: null,
    scoreSJE: null,
    scoreEP: null,
    scorePAS: null,
    scoreCCST: null,
    scoreCCSM: null,
  };
  for (const category of scheme.categories) {
    const scoreKey = scoreKeyForCategory(category);
    const contribution = groups[category.key]?.contribution;
    if (scoreKey && contribution !== null && contribution !== undefined) {
      six[scoreKey] = contribution;
    }
  }

  if (scheme.mode === "total-points") {
    const rawSum = scheme.components.reduce(
      (sum, component) => sum + (scores[component.key] ?? 0),
      0,
    );
    const rawTotal = anyEntered ? rawSum + bonus : null;
    const passingTotal = scheme.passingTotal ?? totalMax;
    const verdict = incomplete
      ? "incomplete"
      : (rawTotal ?? 0) >= passingTotal
        ? "pass"
        : "fail";
    return {
      mode: scheme.mode,
      total: rawTotal,
      totalMax,
      weightedTotal: weighted,
      passingTotal,
      bonusApplied: anyEntered ? bonus : 0,
      verdict,
      six,
      groups,
    };
  }

  const verdict = incomplete
    ? "incomplete"
    : (weighted ?? 0) >= 70
      ? "pass"
      : "fail";
  return {
    mode: scheme.mode,
    total: weighted,
    totalMax: 100,
    weightedTotal: weighted,
    passingTotal: 70,
    bonusApplied,
    verdict,
    six,
    groups,
  };
}

/** Display-only assessment pass check. */
export function isComponentPassing(
  component: SchemeAssessment,
  score: number,
): boolean | null {
  if (component.passing === undefined) return null;
  return score >= component.passing;
}

export function makeCategoryKey(label: string, fallbackIndex: number): string {
  return cleanKey(label, `category-${fallbackIndex}`);
}
