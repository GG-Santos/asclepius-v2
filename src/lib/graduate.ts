import type { Graduate, GraduateStatus, MediaAsset } from "@prisma/client";

export type GraduateWithPhoto = Graduate & { photo: MediaAsset | null };

/**
 * Parse the free-text dates from legacy records into real Dates, best-effort.
 * Legacy data uses many formats ("Aug 03,2024", "September 12, 2021",
 * "Sept 03, 2023"). We always keep the raw string; this is only for derivations
 * like expiry. Returns null when unparseable.
 */
export function parseLooseDate(input?: string | null): Date | null {
  if (!input) return null;
  const cleaned = input
    .trim()
    .replace(/sept\b/gi, "Sep") // JS Date doesn't understand "Sept"
    .replace(/,(\S)/g, ", $1") // "Aug 03,2024" -> "Aug 03, 2024"
    .replace(/\s+/g, " ");
  const t = Date.parse(cleaned);
  return Number.isNaN(t) ? null : new Date(t);
}

export function isExpired(expiresAt?: Date | null): boolean {
  if (!expiresAt) return false; // unknown expiry is not treated as expired
  return expiresAt.getTime() < Date.now();
}

/** Numeric batch index parsed from a code like "BATCH-05" → 5. */
export function batchNumber(batchCode?: string | null): number | null {
  const m = batchCode?.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : null;
}

/**
 * Batch 5 is the only legacy batch: its grade book has no per-assessment
 * student scores, only the final certificate values. Every later batch has
 * full student grades imported from the official grade book.
 */
export function isLegacyBatch(batchCode?: string | null): boolean {
  return batchNumber(batchCode) === 5;
}

/**
 * Records-only batches (11 — Asian Hospital, 16 — Noah Medical Center): kept
 * in the registry for record purposes but archived — excluded from rankings
 * and analytics, hidden from public verification, not eligible for renewal.
 */
export function isRecordsOnlyBatch(batchCode?: string | null): boolean {
  const n = batchNumber(batchCode);
  return n === 11 || n === 16;
}

export const SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

export type ScoreKey = (typeof SCORE_KEYS)[number];

/**
 * Total Evaluation (0–100). The six proficiency scores are stored as already-
 * weighted points — FWE/EP up to 10, SJE/PAS up to 15, CCST/CCSM up to 25 —
 * which sum to 100. So the total is simply their sum (NOT a second weighting).
 * null when no scores are recorded; partial records sum the points present.
 */
export function scoreTotal(
  g: Pick<Graduate, (typeof SCORE_KEYS)[number]> & {
    bonusPoints?: number | null;
  },
): number | null {
  let sum = 0;
  let present = 0;
  for (const k of SCORE_KEYS) {
    const v = g[k];
    if (typeof v === "number") {
      sum += v;
      present++;
    }
  }
  if (present === 0) return null;
  // Bonus/reconciliation points are their own line: Total = six + bonus.
  return Math.round((sum + (g.bonusPoints ?? 0)) * 100) / 100;
}

/** Count of the six scores that are populated (for completeness display). */
export function scoreCompleteness(
  g: Pick<Graduate, (typeof SCORE_KEYS)[number]>,
): { present: number; total: number } {
  const present = SCORE_KEYS.filter((k) => typeof g[k] === "number").length;
  return { present, total: SCORE_KEYS.length };
}

export type VerificationState = "verified" | "expired" | "archived";

export function verificationState(g: {
  status: GraduateStatus;
  expiresAt?: Date | null;
}): VerificationState {
  if (g.status === "ARCHIVED") return "archived";
  if (isExpired(g.expiresAt)) return "expired";
  return "verified";
}

export function rankingLabel(ranking?: number | null): {
  label: string;
  medal: string | null;
} {
  switch (ranking) {
    case 1:
      return { label: "Rank 1", medal: "🥇" };
    case 2:
      return { label: "Rank 2", medal: "🥈" };
    case 3:
      return { label: "Rank 3", medal: "🥉" };
    default:
      return { label: "Passed", medal: null };
  }
}

export type ScoreRow = {
  key: ScoreKey;
  weight: string;
  label: string;
};

export const SCORE_ROWS: ScoreRow[] = [
  { key: "scoreFWE", weight: "10%", label: "Final Written Examination" },
  {
    key: "scoreSJE",
    weight: "15%",
    label: "Situational Judgement Examination",
  },
  { key: "scoreEP", weight: "10%", label: "Equipment Proficiency" },
  { key: "scorePAS", weight: "15%", label: "Patient Assessment Skills" },
  { key: "scoreCCST", weight: "25%", label: "Critical Case: Trauma" },
  { key: "scoreCCSM", weight: "25%", label: "Critical Case: Medical" },
];

const BATCH_08_SCORE_ROWS: ScoreRow[] = [
  { key: "scoreFWE", weight: "10%", label: "Final Written Examination" },
  {
    key: "scoreSJE",
    weight: "15%",
    label: "Situational Judgement Examination",
  },
  {
    key: "scoreEP",
    weight: "25%",
    label: "Equipment / Patient Assessment",
  },
  { key: "scoreCCST", weight: "25%", label: "Critical Case: Trauma" },
  { key: "scoreCCSM", weight: "25%", label: "Critical Case: Medical" },
];

const BATCH_11_SCORE_ROWS: typeof SCORE_ROWS = [
  {
    key: "scoreFWE",
    weight: "83.33%",
    label: "Final Written Examination",
  },
  {
    key: "scoreCCSM",
    weight: "8.33%",
    label: "Practical Exam: Medical",
  },
  {
    key: "scoreCCST",
    weight: "8.33%",
    label: "Practical Exam: Trauma",
  },
];

export function parseProficiencyRows(json: unknown): ScoreRow[] | null {
  if (!Array.isArray(json) || json.length === 0) return null;
  const keys = new Set<ScoreKey>();
  const rows: ScoreRow[] = [];
  for (const entry of json) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return null;
    const record = entry as Record<string, unknown>;
    const key = record.key;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const weight =
      typeof record.weight === "string" ? record.weight.trim() : "";
    if (!SCORE_KEYS.includes(key as ScoreKey)) return null;
    if (!label || !weight) return null;
    if (keys.has(key as ScoreKey)) return null;
    keys.add(key as ScoreKey);
    rows.push({ key: key as ScoreKey, label, weight });
  }
  return rows;
}

export function scoreRowsFor(
  batchCode?: string | null,
  proficiencyRows?: unknown,
): typeof SCORE_ROWS {
  const customRows = parseProficiencyRows(proficiencyRows);
  if (customRows) return customRows;
  if (batchCode === "BATCH-08") return BATCH_08_SCORE_ROWS;
  if (batchCode === "BATCH-11") return BATCH_11_SCORE_ROWS;
  return SCORE_ROWS;
}

export function statusBadgeVariant(
  state: VerificationState,
): "verified" | "expired" | "neutral" {
  if (state === "verified") return "verified";
  if (state === "expired") return "expired";
  return "neutral";
}

/** Display a name, falling back gracefully for legacy records that lost it. */
export function displayName(g: Pick<Graduate, "name" | "lcn">): string {
  const n = g.name?.trim();
  if (!n || n.toLowerCase() === "legal name") return `License ${g.lcn}`;
  return n;
}

export type NameParts = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
};

const SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

/** Compose "First Middle Last Suffix" from parts; returns null if all empty. */
export function composeName(parts: NameParts): string | null {
  const ordered = [
    parts.firstName,
    parts.middleName,
    parts.lastName,
    parts.suffix,
  ]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return ordered.length ? ordered.join(" ") : null;
}

/** "Last, First Middle Suffix" — for alphabetical / formal display. */
export function formatLastFirst(parts: NameParts): string | null {
  const last = parts.lastName?.trim();
  if (!last) return composeName(parts);
  const rest = [parts.firstName, parts.middleName, parts.suffix]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .join(" ");
  return rest ? `${last}, ${rest}` : last;
}

/**
 * Best-effort split of a raw legacy name string into parts. Detects common
 * suffixes; treats the final remaining token as the last name and the first as
 * the first name. Used by the migration to back-fill structure.
 */
export function splitName(raw?: string | null): NameParts {
  const tokens = raw?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (tokens.length === 0) return {};
  let suffix: string | undefined;
  const last = tokens[tokens.length - 1];
  if (SUFFIXES.has(last.toLowerCase())) {
    suffix = tokens.pop();
  }
  if (tokens.length === 1) return { firstName: tokens[0], suffix };
  const firstName = tokens.shift();
  const lastName = tokens.pop();
  const middleName = tokens.join(" ") || undefined;
  return { firstName, middleName, lastName, suffix };
}
