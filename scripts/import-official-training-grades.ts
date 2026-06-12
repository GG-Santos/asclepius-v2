/**
 * Import official EMT training grades from the Word grade book.
 *
 * Dry run:
 *   npx tsx scripts/import-official-training-grades.ts
 *
 * Apply:
 *   npx tsx scripts/import-official-training-grades.ts --apply
 *
 * Verify database against the official grade book:
 *   npx tsx scripts/import-official-training-grades.ts --verify
 *
 * Optional:
 *   npx tsx scripts/import-official-training-grades.ts --docx "C:\path\grades.docx"
 */

import { readFileSync } from "node:fs";
import { type Prisma, PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import JSZip from "jszip";
import { SaxesParser } from "saxes";
import {
  buildLegacyComponentScheme,
  computeSchemeResult,
  type GradingScheme,
  officialTemplateForBatchCode,
  type SchemeComponent,
} from "../src/lib/assessment-scheme";
import { isLegacyBatch, isRecordsOnlyBatch } from "../src/lib/graduate";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local" });

const prisma = new PrismaClient();

const DEFAULT_DOCX_PATH =
  "C:\\Users\\gino0\\Downloads\\0 - official Training GRADES (all batches).docx";

const SCORE_KEYS = [
  "scoreFWE",
  "scoreSJE",
  "scoreEP",
  "scorePAS",
  "scoreCCST",
  "scoreCCSM",
] as const;

type GraduateScoreKey = (typeof SCORE_KEYS)[number];
type ProficiencyRow = {
  key: GraduateScoreKey;
  weight: string;
  label: string;
};
type RowStatus = "GRADUATED" | "FAILED" | "IN_TRAINING";

/**
 * Signed bonus/reconciliation in TOTAL EVALUATION POINTS recovered from the
 * issued certificates (legacy LCN registry): certificate total minus the pure
 * grade-sheet computation. A separate line in the breakdown — never folded
 * into SJE or any category. Keyed by enrollment number; supersedes any
 * sheet-derived bonus (the certificate delta already includes it). Excluded
 * from official-total validation (the grade sheet does not include it).
 */
const CERT_BONUS_POINTS: Record<string, number> = {
  "S-2023-0801": -0.03, // A08-230906 JANNEL C ATAIZA
  "S-2023-0802": -2.38, // A08-230905 RODERICK (Jedrick) A BUGNOS
  "S-2023-0803": -8.87, // A08-230902 HARRY (HEERO) A FUMERA
  "S-2023-0805": -0.54, // A08-230903 ERWIN F PADRIGO
  "S-2023-0806": 0.57, // A08-230901 ALVAN REUEL L PARICO
  "S-2023-0807": -3.27, // A08-230904 CHRISTIAN (IAN) MARIA RAVINO
  "S-2024-0902": 2.42, // A09-240801 MATHEN BLANCO
  "S-2024-0903": 2.92, // A09-240802 JAY P CAL
  "S-2024-0904": 2.11, // A09-240803 Dra. ANNA MAY CARINA
  "S-2024-0905": 2.33, // A09-240804 JOHN CARLO CARINA
  "S-2024-0906": 0.1, // A09-240805 RHISA GENERALAO
  "S-2024-0907": 3.28, // A09-240806 GERALD C GLOVA
  "S-2024-0908": 5.4, // A09-240807 ANTONIO (foxtrot) c/o sir Adrian P PARTO
  "S-2024-0909": 2.89, // A09-240808 GINO ARWIN G SANTOS
  "S-2024-0910": 4.38, // A09-240809 KARL MANUEL M TOMAGOS
  "S-2024-1001": 1.93, // A10-241001 GEORGINA GAZELLE A ABINON -
  "S-2024-1003": 5.28, // A10-241002 RINALYN S ASDAIN -
  "S-2024-1004": -5.72, // A10-241003 GANDIANNE ISHI P BARTOLAY
  "S-2024-1005": -2.94, // A10-241004 LOVELY D BASMAYOR
  "S-2024-1007": 4.34, // A10-241005 JHAN RHEY B BORNASAL
  "S-2024-1010": -1.98, // A10-241006 JHONNY P DOÑO
  "S-2024-1012": -0.98, // A10-241007 JHON EDWARD S FERMANES
  "S-2024-1013": 1.34, // A10-241008 JOMARI ASHLEE L HINLO -
  "S-2024-1014": -0.44, // A10-241009 CLERHENZ JULIAN R JOCSON
  "S-2024-1018": 4.57, // A10-241010 ASHLEY A OLLERO
  "S-2024-1019": -2.16, // A10-241011 DAVID ANGELO P ONG
  "S-2024-1020": 4.1, // A10-241012 CAMILLE M ORDOÑEZ
  "S-2024-1021": 1.16, // A10-241013 FERDINAND G PALACIO-
  "S-2024-1023": 2.29, // A10-241014 YESSAMIN P TAN
  "S-2024-1024": -1.63, // A10-241015 JEDDAHLYN H URBANO
  "S-2025-1203": -0.13, // A12-250701 LEA MAY E CORTEZ
  "S-2025-1204": -0.16, // A12-250702 QUINN LIANNE I CUEVAS
  "S-2025-1205": 0.01, // A12-250703 NEIL PATRICK C ESCOTA
  "S-2025-1207": 0.86, // A12-250705 TOMAS P ZEPEDA JR
  "S-2025-1501": 0.62, // A15-251202 Kurt Agunday
  "S-2025-1502": 0.56, // A15-251203 Misalea C Barroga
  "S-2025-1503": 4.34, // A15-251205 Ceasar M Columna
  "S-2025-1504": 0.11, // A15-251201 John Patrick D Mamaclay
  "S-2025-1505": 9.08, // A15-251206 Cath Santos Sembrano
  "S-2025-1506": 7.81, // A15-251204 Angelica Villanobos
  "S-2025-1601": 8.2, // A16-251206 Efren Miguell A Balmeo
  "S-2025-1602": 2.33, // A16-251205 Neil P Espinola
  "S-2025-1603": -0.93, // A16-251203 Justine E Natividad
  "S-2025-1604": 0.39, // A16-251204 Kimwill Darrel B Pergis
  "S-2025-1605": 0.02, // A16-251202 Rachelle Noelle Rafael
  "S-2025-1606": 0.04, // A16-251201 Winona Kate A Tumlos
};

const BATCH_08_PROFICIENCY_ROWS: ProficiencyRow[] = [
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

const BATCH_11_PROFICIENCY_ROWS: ProficiencyRow[] = [
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

type ImportArgs = {
  apply: boolean;
  verify: boolean;
  docxPath: string;
};

type DocxTable = string[][];

type RowContext = {
  row: string[];
  config: BatchConfig;
};

type ComponentReader = {
  component: SchemeComponent;
  read: (ctx: RowContext) => number | null;
  countsInOfficialTotal?: boolean;
};

type BatchConfig = {
  code: string;
  tableIndex: number;
  studentYear: number;
  graduatedAt: string | null;
  label?: string;
  description?: string;
  startRow: number;
  completed: boolean;
  passingTotal: number | null;
  totalCol: number | null;
  remarkCols: number[];
  missingAsZero: boolean;
  proficiencyRows?: ProficiencyRow[];
  components: ComponentReader[];
};

type OfficialRow = {
  batch: BatchConfig;
  rowNumber: number;
  sequence: number;
  enrollmentNo: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  suffix: string | null;
  displayName: string;
  scores: Record<string, number | null>;
  bonusPoints: number | null;
  bonusNote: string | null;
  /** Sheet-derived raw bonus (quiz points) — used for sheet-total validation. */
  sheetRawBonus: number;
  total: number | null;
  officialText: string;
  status: RowStatus;
  six: Record<GraduateScoreKey, number | null>;
  weighted: number | null;
};

type ExistingGraduate = Awaited<
  ReturnType<typeof prisma.graduate.findMany>
>[number];

type BatchPlan = {
  batch: BatchConfig;
  rows: OfficialRow[];
  passRows: OfficialRow[];
  failedRows: OfficialRow[];
  trainingRows: OfficialRow[];
  matchedPasses: Map<string, ExistingGraduate>;
  existingToArchive: ExistingGraduate[];
};

type ImportPlan = {
  batches: BatchPlan[];
  totals: {
    batches: number;
    rows: number;
    passRows: number;
    failedRows: number;
    trainingRows: number;
    graduateCreates: number;
    graduateUpdates: number;
    graduateArchives: number;
    studentUpserts: number;
  };
};

function parseArgs(): ImportArgs {
  let docxPath = DEFAULT_DOCX_PATH;
  let apply = false;
  let verify = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--apply") apply = true;
    else if (arg === "--verify") verify = true;
    else if (arg.startsWith("--docx=")) docxPath = arg.slice("--docx=".length);
    else if (arg === "--dry-run") apply = false;
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { apply, verify, docxPath };
}

function localName(name: string): string {
  const idx = name.indexOf(":");
  return idx === -1 ? name : name.slice(idx + 1);
}

async function readDocxTables(path: string): Promise<DocxTable[]> {
  const zip = await JSZip.loadAsync(readFileSync(path));
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("DOCX is missing word/document.xml");
  const xml = await document.async("string");

  const tables: DocxTable[] = [];
  let table: DocxTable | null = null;
  let row: string[] | null = null;
  let cell: string | null = null;
  let inText = false;

  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (node) => {
    const name = localName(node.name);
    if (name === "tbl") table = [];
    else if (name === "tr" && table) row = [];
    else if (name === "tc" && row) cell = "";
    else if ((name === "t" || name === "instrText") && cell !== null) {
      inText = true;
    } else if (name === "tab" && cell !== null) {
      cell += " ";
    } else if (name === "br" && cell !== null) {
      cell += " ";
    }
  });
  parser.on("text", (text) => {
    if (inText && cell !== null) cell += text;
  });
  parser.on("closetag", (node) => {
    const rawName = typeof node === "string" ? node : node.name;
    const name = localName(rawName);
    if (name === "t" || name === "instrText") {
      inText = false;
    } else if (name === "tc" && row && cell !== null) {
      row.push(cell.replace(/\s+/g, " ").trim());
      cell = null;
    } else if (name === "tr" && table && row) {
      table.push(row);
      row = null;
    } else if (name === "tbl" && table) {
      tables.push(table);
      table = null;
    }
  });
  parser.write(xml).close();
  return tables;
}

function n(value: string | undefined | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (/^(a|absent)$/i.test(normalized)) return 0;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreN(value: string | undefined | null): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (/^(a|absent)$/i.test(normalized)) return 0;
  if (/[a-z]/i.test(normalized)) return null;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function numbers(value: string | undefined | null): number[] {
  if (!value) return [];
  return Array.from(value.replace(/,/g, "").matchAll(/-?\d+(?:\.\d+)?/g))
    .map((m) => Number(m[0]))
    .filter(Number.isFinite);
}

function splitCombinedTotal(
  first: number | null,
  combined: number | null,
): { second: number; total: number } | null {
  if (first === null || combined === null || !Number.isInteger(combined)) {
    return null;
  }
  const digits = String(Math.abs(combined));
  for (let i = 1; i < digits.length; i += 1) {
    const second = Number(digits.slice(0, i));
    const total = Number(digits.slice(i));
    if (first + second === total) return { second, total };
  }
  return null;
}

function trailingTotal(
  value: string | undefined | null,
  max: number,
): number | null {
  if (!value) return null;
  const compact = value.replace(/,/g, "");
  const direct = Array.from(compact.matchAll(/-?\d+(?:\.\d+)?/g)).map(
    (m) => m[0],
  );
  for (let i = direct.length - 1; i >= 0; i -= 1) {
    const parsed = Number(direct[i]);
    if (Number.isFinite(parsed) && parsed <= max) return parsed;
    if (/^\d{4,}$/.test(direct[i] ?? "")) {
      for (const width of [3, 2, 1]) {
        const suffix = (direct[i] ?? "").slice(-width);
        const candidate = Number(suffix);
        if (Number.isFinite(candidate) && candidate <= max) return candidate;
      }
    }
  }
  return null;
}

function splitTotal(value: string | undefined | null): {
  first: number | null;
  second: number | null;
  total: number | null;
} {
  const nums = numbers(value);
  if (nums.length === 0) return { first: null, second: null, total: null };
  const [first = null, second = null] = nums;
  const explicitTotal = nums.length >= 3 ? nums[nums.length - 1] : null;
  const combined = nums.length === 2 ? splitCombinedTotal(first, second) : null;
  return {
    first,
    second:
      explicitTotal !== null && first !== null
        ? explicitTotal - first
        : (combined?.second ?? second),
    total: explicitTotal ?? combined?.total ?? (first ?? 0) + (second ?? 0),
  };
}

function col(index: number): (ctx: RowContext) => number | null {
  return ({ row }) => scoreN(row[index]);
}

function isOnlineEmtRow(row: string[]): boolean {
  return row.some((cell) => /online emt/i.test(cell));
}

function colEither(
  normalIndex: number,
  onlineIndex: number,
): (ctx: RowContext) => number | null {
  return ({ row }) =>
    scoreN(row[isOnlineEmtRow(row) ? onlineIndex : normalIndex]);
}

function totalCol(
  index: number,
  max: number,
): (ctx: RowContext) => number | null {
  return ({ row }) => trailingTotal(row[index], max);
}

function totalColEither(
  normalIndex: number,
  onlineIndex: number,
  max: number,
): (ctx: RowContext) => number | null {
  return ({ row }) =>
    trailingTotal(row[isOnlineEmtRow(row) ? onlineIndex : normalIndex], max);
}

function splitCol(
  index: number,
  part: "first" | "second" | "total",
): (ctx: RowContext) => number | null {
  return ({ row }) => splitTotal(row[index])[part];
}

function splitColEither(
  normalIndex: number,
  onlineIndex: number,
  part: "first" | "second" | "total",
): (ctx: RowContext) => number | null {
  return ({ row }) =>
    splitTotal(row[isOnlineEmtRow(row) ? onlineIndex : normalIndex])[part];
}

function component(
  key: string,
  label: string,
  group: SchemeComponent["group"],
  maxScore: number,
  passing: number | undefined,
  read: (ctx: RowContext) => number | null,
  countsInOfficialTotal = true,
): ComponentReader {
  return {
    component: { key, label, group, maxScore, passing },
    read,
    countsInOfficialTotal,
  };
}

function quizzes(
  maxes: number[],
  startCol: number,
  passings: number[],
): ComponentReader[] {
  return maxes.map((maxScore, i) =>
    component(
      `q${i + 1}`,
      `Q${i + 1}`,
      "SJE",
      maxScore,
      passings[i],
      col(startCol + i),
    ),
  );
}

function officialText(row: string[], cols: number[]): string {
  return cols
    .map((c) => row[c])
    .filter(Boolean)
    .join(" ")
    .trim();
}

function readOfficialTotal(config: BatchConfig, row: string[]): number | null {
  const primary = config.totalCol === null ? null : n(row[config.totalCol]);
  if (primary !== null) return primary;
  if (config.code === "BATCH-15" && isOnlineEmtRow(row)) return n(row[11]);
  return null;
}

function officialComponentSum(
  config: BatchConfig,
  scores: Record<string, number | null>,
): number {
  return config.components.reduce(
    (sum, reader) =>
      sum +
      (reader.countsInOfficialTotal === false
        ? 0
        : (scores[reader.component.key] ?? 0)),
    0,
  );
}

function batchNumber(code: string): number {
  return Number(code.replace(/\D/g, ""));
}

function enrollmentNo(year: number, code: string, rowNo: number): string {
  return `S-${year}-${String(batchNumber(code)).padStart(2, "0")}${String(
    rowNo,
  ).padStart(2, "0")}`;
}

function asDate(input: string): Date {
  return new Date(`${input}T00:00:00.000Z`);
}

function formatRawDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function buildLcn(code: string, graduatedAt: string, sequence: number): string {
  const date = asDate(graduatedAt);
  const yy = String(date.getUTCFullYear()).slice(2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `A${String(batchNumber(code)).padStart(2, "0")}-${yy}${mm}${String(
    sequence,
  ).padStart(2, "0")}`;
}

function cleanTokenText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[“”]/g, " ")
    .replace(/[*.,]/g, " ")
    .replace(/\b(ss|rn|bsn|dmd|dra|dr|cav|man|foxtrot|online|emt)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function tokens(value: string): string[] {
  return cleanTokenText(value)
    .split(/\s+/)
    .filter(
      (t) => t && !["jr", "sr", "ii", "iii", "iv", "v", "ma"].includes(t),
    );
}

function cleanLastName(value: string): {
  lastName: string;
  suffix: string | null;
} {
  const withoutNoise = value
    .replace(/\([^)]*\)/g, "")
    .replace(/\b-?SS\b/gi, "")
    .replace(/\bCAV\b/gi, "")
    .replace(/\bRN\b/gi, "")
    .replace(/\bBSN\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const suffixMatch = withoutNoise.match(/\b(JR\.?|SR\.?|II|III|IV|V)$/i);
  const suffix = suffixMatch ? suffixMatch[1].replace(/\.$/, ".") : null;
  const lastName = suffixMatch
    ? withoutNoise.slice(0, suffixMatch.index).trim()
    : withoutNoise;
  return { lastName, suffix };
}

function cleanFirstName(value: string): string {
  return value
    .replace(/^\*\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMiddleName(value: string | undefined): string | null {
  const trimmed = value?.replace(/\./g, "").trim();
  return trimmed || null;
}

function displayName(row: OfficialRow): string {
  return [row.firstName, row.middleName, row.lastName, row.suffix]
    .filter((v): v is string => Boolean(v))
    .join(" ");
}

function officialNameKey(row: OfficialRow): {
  first: string | null;
  last: string | null;
  all: Set<string>;
} {
  const first = tokens(row.firstName)[0] ?? null;
  const last = tokens(row.lastName)[0] ?? null;
  return {
    first,
    last,
    all: new Set(tokens(`${row.firstName} ${row.lastName}`)),
  };
}

function graduateTokens(graduate: ExistingGraduate): Set<string> {
  return new Set(
    tokens(
      [
        graduate.name,
        graduate.firstName,
        graduate.middleName,
        graduate.lastName,
        graduate.suffix,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  );
}

function matchGraduate(
  row: OfficialRow,
  candidates: ExistingGraduate[],
): ExistingGraduate | null {
  const key = officialNameKey(row);
  const scored = candidates
    .map((candidate) => {
      const t = graduateTokens(candidate);
      let score = 0;
      if (key.last && t.has(key.last)) score += 4;
      if (key.first && t.has(key.first)) score += 3;
      for (const token of key.all) if (t.has(token)) score += 1;
      return { candidate, score };
    })
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return null;
  if (scored.length === 1 || scored[0].score > scored[1].score) {
    return scored[0].candidate;
  }
  return null;
}

function schemeFor(config: BatchConfig): GradingScheme | null {
  if (config.passingTotal === null) return null;
  const officialTemplate = officialTemplateForBatchCode(config.code);
  if (officialTemplate) return officialTemplate.scheme;
  return buildLegacyComponentScheme(
    config.components.map((c) => c.component),
    {
      mode: "category-average",
      missingAsZero: config.missingAsZero,
    },
  );
}

function statusFromRow(
  config: BatchConfig,
  scores: Record<string, number | null>,
  bonusPoints: number | null,
  total: number | null,
  text: string,
): { status: RowStatus; six: OfficialRow["six"]; weighted: number | null } {
  const emptySix = {
    scoreFWE: null,
    scoreSJE: null,
    scoreEP: null,
    scorePAS: null,
    scoreCCST: null,
    scoreCCSM: null,
  };
  const lower = text.toLowerCase();
  const explicitFail =
    lower.includes("failed") ||
    lower.includes("dropped") ||
    lower.includes("not qualify") ||
    lower.includes("sick/died");
  const explicitPass = lower.includes("passed") || lower.includes("first");
  const scheme = schemeFor(config);
  if (!scheme) {
    return {
      status: explicitPass ? "GRADUATED" : "FAILED",
      six: emptySix,
      weighted: null,
    };
  }
  const result = computeSchemeResult(scheme, scores, bonusPoints);
  const present = Object.values(result.six).filter(
    (v): v is number => v !== null,
  );
  const weighted =
    result.verdict === "incomplete" || present.length === 0
      ? null
      : Math.round(present.reduce((sum, value) => sum + value, 0) * 100) / 100;
  if (!config.completed) {
    return {
      status: explicitFail ? "FAILED" : "IN_TRAINING",
      six: result.six,
      weighted,
    };
  }
  if (explicitFail) return { status: "FAILED", six: result.six, weighted };
  if (
    result.verdict === "pass" ||
    (total !== null && total >= (config.passingTotal ?? 0))
  ) {
    return { status: "GRADUATED", six: result.six, weighted };
  }
  return { status: "FAILED", six: result.six, weighted };
}

function rowToOfficial(
  config: BatchConfig,
  row: string[],
  sequence: number,
): OfficialRow | null {
  const rowNumber = n(row[0]);
  const rawLast = row[1]?.trim();
  const rawFirst = row[2]?.trim();
  if (!rowNumber || !rawLast || !rawFirst || /^last name$/i.test(rawLast)) {
    return null;
  }

  const { lastName, suffix } = cleanLastName(rawLast);
  const middleName = cleanMiddleName(row[3]);
  const firstName = cleanFirstName(rawFirst);
  const scores: Record<string, number | null> = {};
  for (const reader of config.components) {
    scores[reader.component.key] = reader.read({ row, config });
  }
  const text = officialText(row, config.remarkCols);
  const total = readOfficialTotal(config, row);
  const componentSum = officialComponentSum(config, scores);
  const hasBonus = text.includes("+66");
  const officialAdjustment =
    !hasBonus &&
    config.completed &&
    total !== null &&
    Math.abs(total - componentSum) > 1
      ? Math.round((total - componentSum) * 100) / 100
      : 0;
  const sheetRawBonus = hasBonus
    ? 66
    : officialAdjustment > 0
      ? officialAdjustment
      : 0;
  const sheetBonusNote = hasBonus
    ? "Official +66 bonus noted on grade sheet"
    : officialAdjustment > 0
      ? "Official total reconciliation from grade sheet"
      : null;
  const rowEnrollmentNo = enrollmentNo(
    config.studentYear,
    config.code,
    sequence,
  );
  // Bonus is stored in TOTAL EVALUATION POINTS (its own line in the
  // breakdown). Sheet-derived raw quiz bonuses convert via the batch's SJE
  // weight over its quiz max; a certificate reconciliation supersedes them
  // (the certificate delta already includes any sheet bonus).
  const rowScheme = schemeFor(config);
  const sjeCategory = rowScheme?.categories.find(
    (c) => c.legacyGroup === "SJE",
  );
  const sjeMax =
    sjeCategory?.assessments.reduce((s, a) => s + a.maxScore, 0) ?? 0;
  const sheetPointsBonus =
    sheetRawBonus > 0 && sjeCategory && sjeMax > 0
      ? Math.round(((sheetRawBonus * sjeCategory.weight) / sjeMax) * 100) / 100
      : 0;
  const certPoints = CERT_BONUS_POINTS[rowEnrollmentNo];
  const pointsBonus = certPoints !== undefined ? certPoints : sheetPointsBonus;
  const bonusPoints = pointsBonus !== 0 ? pointsBonus : null;
  const bonusNote =
    [
      sheetBonusNote,
      certPoints !== undefined
        ? `Reconciled to issued certificate (${certPoints > 0 ? "+" : ""}${certPoints} points)`
        : null,
    ]
      .filter(Boolean)
      .join("; ") || null;
  const evaluated = statusFromRow(config, scores, bonusPoints, total, text);
  const base = {
    batch: config,
    rowNumber,
    sequence,
    enrollmentNo: rowEnrollmentNo,
    lastName,
    firstName,
    middleName,
    suffix,
    displayName: "",
    scores,
    bonusPoints,
    bonusNote,
    sheetRawBonus,
    total,
    officialText: text,
    status: evaluated.status,
    six: evaluated.six,
    weighted: evaluated.weighted,
  };
  return { ...base, displayName: displayName(base) };
}

const batchConfigs: BatchConfig[] = [
  {
    code: "BATCH-05",
    tableIndex: 0,
    studentYear: 2021,
    graduatedAt: "2021-08-03",
    label: "Armedsafe Batch 5 / ERA Batch 1",
    startRow: 6,
    completed: true,
    passingTotal: null,
    totalCol: null,
    remarkCols: [21],
    missingAsZero: true,
    components: [],
  },
  {
    code: "BATCH-08",
    tableIndex: 1,
    studentYear: 2023,
    graduatedAt: "2023-09-03",
    label: "Armedsafe Batch 8 / ERA Batch 2",
    startRow: 6,
    completed: true,
    passingTotal: 1400,
    totalCol: 20,
    remarkCols: [20, 21, 22],
    missingAsZero: true,
    proficiencyRows: BATCH_08_PROFICIENCY_ROWS,
    components: [
      ...quizzes(
        [40, 60, 100, 100, 60, 50, 50, 40, 200, 100],
        5,
        [20, 30, 50, 50, 30, 25, 25, 20, 100, 50],
      ),
      component("fwe-300", "FWE (300)", "FWE", 300, 150, splitCol(16, "first")),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        350,
        splitCol(16, "second"),
      ),
      component("eqe", "Equipment Examination", "EP", 100, 80, col(17)),
      component(
        "cct",
        "Critical Case Trauma",
        "CCST",
        100,
        80,
        totalCol(18, 100),
      ),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(19)),
    ],
  },
  {
    code: "BATCH-09",
    tableIndex: 2,
    studentYear: 2024,
    graduatedAt: "2024-08-04",
    label: "Armedsafe Batch 9 / ERA Batch 3",
    startRow: 6,
    completed: true,
    passingTotal: 1395,
    totalCol: 21,
    remarkCols: [21, 22],
    missingAsZero: true,
    components: [
      ...quizzes(
        [40, 60, 100, 100, 60, 50, 50, 40, 200, 100],
        5,
        [20, 30, 50, 50, 30, 25, 25, 20, 100, 50],
      ),
      component("fwe-300", "FWE (300)", "FWE", 300, 150, splitCol(16, "first")),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        350,
        splitCol(16, "second"),
      ),
      component("eqe", "Equipment", "EP", 100, 75, col(17)),
      component("pa", "Patient Assessment", "PAS", 200, 160, totalCol(18, 200)),
      component(
        "cct",
        "Critical Case Trauma",
        "CCST",
        100,
        80,
        totalCol(19, 100),
      ),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(20)),
    ],
  },
  {
    code: "BATCH-10",
    tableIndex: 3,
    studentYear: 2024,
    graduatedAt: "2024-10-26",
    label: "Armedsafe Batch 10",
    startRow: 6,
    completed: true,
    passingTotal: 1500,
    totalCol: 23,
    remarkCols: [23, 24, 25, 26],
    missingAsZero: true,
    components: [
      ...quizzes(
        [40, 90, 100, 100, 60, 50, 50, 25, 40, 100, 200, 100],
        5,
        [20, 45, 50, 50, 30, 25, 25, 15, 20, 50, 120, 50],
      ),
      component(
        "fwe",
        "Final Written",
        "FWE",
        1000,
        700,
        splitCol(18, "total"),
      ),
      component("eqe", "Equipment", "EP", 100, 80, col(19)),
      component("pa", "Patient Assessment", "PAS", 200, 160, totalCol(20, 200)),
      component("cct", "Critical Case Trauma", "CCST", 100, 80, col(21)),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(22)),
    ],
  },
  {
    code: "BATCH-11",
    tableIndex: 5,
    studentYear: 2025,
    graduatedAt: "2025-01-11",
    label: "Asian Hospital & Medical Center",
    startRow: 2,
    completed: true,
    passingTotal: 840,
    totalCol: 10,
    remarkCols: [10, 11],
    missingAsZero: true,
    proficiencyRows: BATCH_11_PROFICIENCY_ROWS,
    components: [
      component("fwe-300", "FWE (300)", "FWE", 300, 210, col(4)),
      component("fwe-700", "FWE (700)", "FWE", 700, 490, col(5)),
      component("medical", "Practical Medical", "CCSM", 100, 70, col(7)),
      component("trauma", "Practical Trauma", "CCST", 100, 70, col(8)),
    ],
  },
  {
    code: "BATCH-12",
    tableIndex: 6,
    studentYear: 2025,
    graduatedAt: "2025-07-05",
    label: "Armedsafe Batch 12",
    startRow: 6,
    completed: true,
    passingTotal: 1573,
    totalCol: 21,
    remarkCols: [21, 22, 23],
    missingAsZero: true,
    components: [
      ...quizzes(
        [40, 35, 125, 100, 60, 50, 50, 40, 40, 200],
        5,
        [20, 18, 65, 50, 30, 25, 25, 20, 20, 120],
      ),
      component("fwe-300", "FWE (300)", "FWE", 300, 210, splitCol(16, "first")),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        490,
        splitCol(16, "second"),
      ),
      component("eqe", "Equipment", "EP", 100, 80, col(17)),
      component("pa", "Patient Assessment", "PAS", 300, 240, totalCol(18, 300)),
      component("cct", "Critical Case Trauma", "CCST", 100, 80, col(19)),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(20)),
    ],
  },
  {
    code: "BATCH-15",
    tableIndex: 8,
    studentYear: 2025,
    graduatedAt: "2025-12-27",
    label: "Armedsafe EMT Batch 15",
    startRow: 6,
    completed: true,
    passingTotal: 1430,
    totalCol: 20,
    remarkCols: [20, 21, 22],
    missingAsZero: true,
    components: [
      ...quizzes(
        [40, 60, 100, 100, 60, 40, 100, 200],
        5,
        [20, 30, 50, 50, 30, 20, 50, 100],
      ).map((reader, index) => ({
        ...reader,
        read: (ctx: RowContext) => {
          if (isOnlineEmtRow(ctx.row)) return null;
          if (index < 2) return reader.read(ctx);
          return col(reader.component.key === "q3" ? 8 : 6 + index)(ctx);
        },
      })),
      component(
        "fwe-300",
        "FWE (300)",
        "FWE",
        300,
        210,
        splitColEither(15, 6, "first"),
      ),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        490,
        splitColEither(15, 6, "second"),
      ),
      component("eqe", "Equipment", "EP", 200, 100, colEither(16, 7)),
      component(
        "pa",
        "Patient Assessment",
        "PAS",
        200,
        120,
        totalColEither(17, 8, 200),
      ),
      component(
        "cct",
        "Critical Case Trauma",
        "CCST",
        100,
        80,
        colEither(18, 9),
      ),
      component(
        "ccm",
        "Critical Case Medical",
        "CCSM",
        100,
        80,
        colEither(19, 10),
      ),
    ],
  },
  {
    code: "BATCH-16",
    tableIndex: 10,
    studentYear: 2025,
    graduatedAt: "2025-12-26",
    label: "Noah Medical Center",
    startRow: 6,
    completed: true,
    passingTotal: 1448,
    totalCol: 18,
    remarkCols: [18, 19, 20],
    missingAsZero: true,
    components: [
      ...quizzes(
        [40, 35, 125, 160, 60, 100, 200],
        5,
        [20, 18, 65, 80, 30, 50, 120],
      ),
      component("fwe-300", "FWE (300)", "FWE", 300, 210, splitCol(13, "first")),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        490,
        splitCol(13, "second"),
      ),
      component("eqe", "Equipment", "EP", 100, 65, col(14)),
      component("pa", "Patient Assessment", "PAS", 200, 130, totalCol(15, 200)),
      component("cct", "Critical Case Trauma", "CCST", 100, 80, col(16)),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(17)),
    ],
  },
  {
    code: "BATCH-17",
    tableIndex: 12,
    studentYear: 2026,
    graduatedAt: null,
    label: "EMR of Armedsafe",
    startRow: 6,
    completed: false,
    passingTotal: 1460,
    totalCol: 19,
    remarkCols: [14, 15, 16, 17, 18, 19, 20, 21],
    missingAsZero: false,
    components: [
      ...quizzes(
        [40, 60, 100, 100, 60, 40, 100, 200],
        5,
        [20, 30, 50, 50, 30, 20, 50, 120],
      ),
      component("fwe-300", "FWE (300)", "FWE", 300, 210, splitCol(14, "first")),
      component(
        "fwe-700",
        "FWE (700)",
        "FWE",
        700,
        490,
        splitCol(14, "second"),
      ),
      component("eqe", "Equipment", "EP", 100, 80, col(15)),
      component("pa", "Patient Assessment", "PAS", 200, 150, totalCol(16, 200)),
      component("cct", "Critical Case Trauma", "CCST", 100, 80, col(17)),
      component("ccm", "Critical Case Medical", "CCSM", 100, 80, col(18)),
    ],
  },
];

function validateRows(rows: OfficialRow[]): string[] {
  const errors: string[] = [];
  for (const row of rows) {
    if (row.batch.passingTotal !== null && row.batch.completed) {
      // bonusPoints are evaluation points (not raw) — the sheet total only
      // ever includes the sheet's own raw bonus.
      const scoreSum =
        officialComponentSum(row.batch, row.scores) + row.sheetRawBonus;
      const expectedTotal = row.bonusNote?.includes(
        "Official +66 bonus noted on grade sheet",
      )
        ? (row.total ?? 0) + 66
        : row.total;
      if (expectedTotal !== null && Math.abs(scoreSum - expectedTotal) > 1) {
        errors.push(
          `${row.batch.code} ${row.enrollmentNo} ${row.displayName}: component sum ${scoreSum} does not match official total ${expectedTotal}`,
        );
      }
    }
  }
  return errors;
}

async function buildPlan(tables: DocxTable[]): Promise<ImportPlan> {
  const existing = await prisma.graduate.findMany({
    orderBy: [{ batchCode: "asc" }, { lcn: "asc" }],
  });
  const byBatch = new Map<string, ExistingGraduate[]>();
  for (const graduate of existing) {
    if (!graduate.batchCode) continue;
    byBatch.set(graduate.batchCode, [
      ...(byBatch.get(graduate.batchCode) ?? []),
      graduate,
    ]);
  }

  const batches: BatchPlan[] = [];
  let graduateCreates = 0;
  let graduateUpdates = 0;
  let graduateArchives = 0;

  for (const batch of batchConfigs) {
    const table = tables[batch.tableIndex];
    if (!table)
      throw new Error(`Missing table ${batch.tableIndex} for ${batch.code}`);
    const rows = table
      .slice(batch.startRow)
      .map((row, index) => rowToOfficial(batch, row, index + 1))
      .filter((row): row is OfficialRow => row !== null);
    const passRows = rows.filter((row) => row.status === "GRADUATED");
    const failedRows = rows.filter((row) => row.status === "FAILED");
    const trainingRows = rows.filter((row) => row.status === "IN_TRAINING");
    const candidates = byBatch.get(batch.code) ?? [];
    const matchedPasses = new Map<string, ExistingGraduate>();
    const usedCandidateIds = new Set<string>();
    for (const row of passRows) {
      const match = matchGraduate(
        row,
        candidates.filter((candidate) => !usedCandidateIds.has(candidate.id)),
      );
      if (match) {
        matchedPasses.set(row.enrollmentNo, match);
        usedCandidateIds.add(match.id);
        graduateUpdates += 1;
      } else {
        graduateCreates += 1;
      }
    }
    const officialPassGraduateIds = new Set(usedCandidateIds);
    const existingToArchive = batch.completed
      ? candidates.filter(
          (candidate) =>
            candidate.status !== "ARCHIVED" &&
            !officialPassGraduateIds.has(candidate.id),
        )
      : [];
    graduateArchives += existingToArchive.length;
    batches.push({
      batch,
      rows,
      passRows,
      failedRows,
      trainingRows,
      matchedPasses,
      existingToArchive,
    });
  }

  return {
    batches,
    totals: {
      batches: batches.length,
      rows: batches.reduce((sum, b) => sum + b.rows.length, 0),
      passRows: batches.reduce((sum, b) => sum + b.passRows.length, 0),
      failedRows: batches.reduce((sum, b) => sum + b.failedRows.length, 0),
      trainingRows: batches.reduce((sum, b) => sum + b.trainingRows.length, 0),
      graduateCreates,
      graduateUpdates,
      graduateArchives,
      studentUpserts: batches.reduce((sum, b) => sum + b.rows.length, 0),
    },
  };
}

function printPlan(plan: ImportPlan): void {
  console.log("Official training grades import plan");
  console.log(JSON.stringify(plan.totals, null, 2));
  for (const batch of plan.batches) {
    console.log(
      [
        batch.batch.code,
        `rows=${batch.rows.length}`,
        `graduates=${batch.passRows.length}`,
        `failed=${batch.failedRows.length}`,
        `inTraining=${batch.trainingRows.length}`,
        `matched=${batch.matchedPasses.size}`,
        `newGraduates=${batch.passRows.length - batch.matchedPasses.size}`,
        `archiveGraduates=${batch.existingToArchive.length}`,
      ].join(" "),
    );
    for (const row of batch.passRows) {
      const matched = batch.matchedPasses.get(row.enrollmentNo);
      console.log(
        `  PASS ${row.enrollmentNo} ${row.displayName} total=${row.weighted ?? "n/a"} lcn=${
          matched?.lcn ?? "new"
        }`,
      );
    }
    for (const row of [...batch.failedRows, ...batch.trainingRows]) {
      console.log(
        `  ${row.status} ${row.enrollmentNo} ${row.displayName} officialTotal=${
          row.total ?? "n/a"
        } note=${row.officialText || "n/a"}`,
      );
    }
    for (const graduate of batch.existingToArchive) {
      console.log(`  ARCHIVE ${graduate.lcn} ${graduate.name ?? ""}`);
    }
  }
}

async function recomputeBatchRankings(code: string): Promise<void> {
  // Fetch ALL rows so archived/records-only graduates get their stale
  // ranking cleared; only non-archived rows compete for the top three.
  const rows = await prisma.graduate.findMany({
    where: { batchCode: code },
    select: {
      id: true,
      status: true,
      scoreFWE: true,
      scoreSJE: true,
      scoreEP: true,
      scorePAS: true,
      scoreCCST: true,
      scoreCCSM: true,
      bonusPoints: true,
    },
  });
  const ranked = rows
    .filter((row) => row.status !== "ARCHIVED")
    .map((row) => ({
      id: row.id,
      total:
        SCORE_KEYS.reduce((sum, key) => sum + (row[key] ?? 0), 0) +
        (row.bonusPoints ?? 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
  await Promise.all(
    rows.map((row) => {
      const pos = ranked.findIndex((rankedRow) => rankedRow.id === row.id);
      return prisma.graduate.update({
        where: { id: row.id },
        data: { ranking: pos >= 0 && pos < 3 ? pos + 1 : 0 },
      });
    }),
  );
}

async function applyPlan(plan: ImportPlan): Promise<void> {
  const licenseValidityYears =
    (
      await prisma.orgSettings.findUnique({
        where: { key: "org" },
        select: { licenseValidityYears: true },
      })
    )?.licenseValidityYears ?? 1;

  for (const batchPlan of plan.batches) {
    const { batch } = batchPlan;
    const scheme = schemeFor(batch);
    const batchRecord = await prisma.batch.upsert({
      where: { code: batch.code },
      create: {
        code: batch.code,
        batchNumber: String(batchNumber(batch.code)),
        label: batch.label ?? null,
        description: batch.description ?? null,
        year: batch.studentYear,
        graduated: batch.completed,
        graduatedAt: batch.graduatedAt ? asDate(batch.graduatedAt) : null,
        gradingScheme: scheme as Prisma.InputJsonValue | null,
        proficiencyRows: (batch.proficiencyRows ??
          null) as Prisma.InputJsonValue | null,
      },
      update: {
        batchNumber: String(batchNumber(batch.code)),
        label: batch.label ?? null,
        description: batch.description ?? null,
        year: batch.studentYear,
        graduated: batch.completed,
        graduatedAt: batch.graduatedAt ? asDate(batch.graduatedAt) : null,
        graduationRequested: false,
        gradingScheme: scheme as Prisma.InputJsonValue | null,
        ...(batch.proficiencyRows
          ? {
              proficiencyRows: batch.proficiencyRows as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    let newGraduateSeq =
      (await prisma.graduate.count({ where: { batchCode: batch.code } })) + 1;

    for (const row of batchPlan.rows) {
      const commonStudentData = {
        name: row.displayName,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        suffix: row.suffix,
        batchId: batchRecord.id,
        batchCode: batch.code,
        status: row.status,
        granularGrades: row.scores as Prisma.InputJsonValue,
        bonusPoints: row.bonusPoints,
        bonusNote: row.bonusNote,
        scoreFWE: null,
        scoreEP: null,
        scorePAS: null,
        scoreCCST: null,
        scoreCCSM: null,
        notes: [
          "Official training grades import.",
          row.officialText ? `Sheet note: ${row.officialText}` : null,
          row.total !== null ? `Official total: ${row.total}` : null,
        ]
          .filter(Boolean)
          .join(" "),
      };

      let linkedLcn: string | null = null;
      if (row.status === "GRADUATED" && batch.graduatedAt) {
        const existing = batchPlan.matchedPasses.get(row.enrollmentNo);
        if (existing) {
          linkedLcn = existing.lcn;
          await prisma.graduate.update({
            where: { id: existing.id },
            data: {
              scoreFWE: row.six.scoreFWE,
              scoreSJE: row.six.scoreSJE,
              scoreEP: row.six.scoreEP,
              scorePAS: row.six.scorePAS,
              scoreCCST: row.six.scoreCCST,
              scoreCCSM: row.six.scoreCCSM,
              bonusPoints: row.bonusPoints,
              // Records-only batches stay ARCHIVED. Also keep ARCHIVED for
              // licenses past expiry — the app's auto-archive policy owns that
              // transition; re-importing must not undo it.
              status:
                isRecordsOnlyBatch(batch.code) ||
                (existing.status === "ARCHIVED" &&
                  existing.expiresAt !== null &&
                  existing.expiresAt < new Date())
                  ? "ARCHIVED"
                  : "GRADUATE",
              batchId: batchRecord.id,
              batchCode: batch.code,
              fromStudentEnrollmentNo: row.enrollmentNo,
              legacy: isLegacyBatch(batch.code),
            },
          });
        } else {
          let lcn = buildLcn(batch.code, batch.graduatedAt, newGraduateSeq);
          while (await prisma.graduate.findUnique({ where: { lcn } })) {
            newGraduateSeq += 1;
            lcn = buildLcn(batch.code, batch.graduatedAt, newGraduateSeq);
          }
          linkedLcn = lcn;
          const issuedAt = asDate(batch.graduatedAt);
          const expiresAt = addYears(issuedAt, licenseValidityYears);
          await prisma.graduate.create({
            data: {
              lcn,
              name: row.displayName,
              firstName: row.firstName,
              middleName: row.middleName,
              lastName: row.lastName,
              suffix: row.suffix,
              scoreFWE: row.six.scoreFWE,
              scoreSJE: row.six.scoreSJE,
              scoreEP: row.six.scoreEP,
              scorePAS: row.six.scorePAS,
              scoreCCST: row.six.scoreCCST,
              scoreCCSM: row.six.scoreCCSM,
              bonusPoints: row.bonusPoints,
              issuedAt,
              issuedRaw: formatRawDate(issuedAt),
              expiresAt,
              expirationRaw: formatRawDate(expiresAt),
              registrationRaw: formatRawDate(issuedAt),
              registeredAt: issuedAt,
              status: isRecordsOnlyBatch(batch.code) ? "ARCHIVED" : "GRADUATE",
              legacy: isLegacyBatch(batch.code),
              batchId: batchRecord.id,
              batchCode: batch.code,
              fromStudentEnrollmentNo: row.enrollmentNo,
              notes: "Created from official training grades import.",
            },
          });
          newGraduateSeq += 1;
        }
      }

      await prisma.student.upsert({
        where: { enrollmentNo: row.enrollmentNo },
        create: {
          enrollmentNo: row.enrollmentNo,
          ...commonStudentData,
          graduatedToLcn: linkedLcn,
        },
        update: {
          ...commonStudentData,
          graduatedToLcn: linkedLcn,
        },
      });
    }

    for (const graduate of batchPlan.existingToArchive) {
      await prisma.graduate.update({
        where: { id: graduate.id },
        data: {
          status: "ARCHIVED",
          notes: [
            graduate.notes,
            "Archived by official training grades import: not in official passing set.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });
    }
    await recomputeBatchRankings(batch.code);
  }
}

function sameScore(a: number | null | undefined, b: number | null | undefined) {
  const left = a ?? null;
  const right = b ?? null;
  if (left === null || right === null) return left === right;
  return Math.abs(left - right) < 0.005;
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a.localeCompare(b),
        ),
      );
    }
    return val;
  });
}

function gradeObject(json: Prisma.JsonValue | null): Record<string, unknown> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return json as Record<string, unknown>;
}

type VerifyIssue = {
  batch: string;
  scope: "batch" | "student" | "graduate";
  id: string;
  field: string;
  expected: unknown;
  actual: unknown;
};

type VerifyBatchSummary = {
  code: string;
  rows: number;
  graduates: number;
  failed: number;
  inTraining: number;
  schemaIssues: number;
  studentGradeIssues: number;
  graduateScoreIssues: number;
};

async function verifyPlan(plan: ImportPlan): Promise<void> {
  const issues: VerifyIssue[] = [];
  const summaries: VerifyBatchSummary[] = [];
  const archiveGraceYears =
    (
      await prisma.orgSettings.findUnique({
        where: { key: "org" },
        select: { archiveGraceYears: true },
      })
    )?.archiveGraceYears ?? 2;
  const archiveCutoff = new Date();
  archiveCutoff.setFullYear(archiveCutoff.getFullYear() - archiveGraceYears);

  for (const batchPlan of plan.batches) {
    const { batch } = batchPlan;
    const batchRecord = await prisma.batch.findUnique({
      where: { code: batch.code },
      select: {
        code: true,
        batchNumber: true,
        label: true,
        year: true,
        graduated: true,
        graduatedAt: true,
        gradingScheme: true,
        proficiencyRows: true,
      },
    });
    const students = await prisma.student.findMany({
      where: { batchCode: batch.code },
      select: {
        enrollmentNo: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        suffix: true,
        status: true,
        graduatedToLcn: true,
        batchCode: true,
        granularGrades: true,
        bonusPoints: true,
        bonusNote: true,
        scoreFWE: true,
        scoreEP: true,
        scorePAS: true,
        scoreCCST: true,
        scoreCCSM: true,
      },
      orderBy: { enrollmentNo: "asc" },
    });
    const graduates = await prisma.graduate.findMany({
      where: { batchCode: batch.code },
      select: {
        lcn: true,
        name: true,
        status: true,
        batchCode: true,
        expiresAt: true,
        fromStudentEnrollmentNo: true,
        scoreFWE: true,
        scoreSJE: true,
        scoreEP: true,
        scorePAS: true,
        scoreCCST: true,
        scoreCCSM: true,
        bonusPoints: true,
      },
      orderBy: { lcn: "asc" },
    });

    const issueStart = issues.length;
    const push = (
      scope: VerifyIssue["scope"],
      id: string,
      field: string,
      expected: unknown,
      actual: unknown,
    ) => {
      issues.push({ batch: batch.code, scope, id, field, expected, actual });
    };

    if (!batchRecord) {
      push("batch", batch.code, "exists", true, false);
    } else {
      const expectedScheme = schemeFor(batch);
      const actualGraduatedAt =
        batchRecord.graduatedAt?.toISOString().slice(0, 10) ?? null;
      const expectedFields: Record<string, unknown> = {
        batchNumber: String(batchNumber(batch.code)),
        label: batch.label ?? null,
        year: batch.studentYear,
        graduated: batch.completed,
        graduatedAt: batch.graduatedAt,
        gradingScheme: expectedScheme,
        ...(batch.proficiencyRows
          ? { proficiencyRows: batch.proficiencyRows }
          : {}),
      };
      const actualFields: Record<string, unknown> = {
        batchNumber: batchRecord.batchNumber,
        label: batchRecord.label,
        year: batchRecord.year,
        graduated: batchRecord.graduated,
        graduatedAt: actualGraduatedAt,
        gradingScheme: batchRecord.gradingScheme,
        proficiencyRows: batchRecord.proficiencyRows,
      };
      for (const [field, expected] of Object.entries(expectedFields)) {
        const actual = actualFields[field];
        const ok =
          field === "gradingScheme" || field === "proficiencyRows"
            ? stableJson(actual) === stableJson(expected)
            : actual === expected;
        if (!ok) push("batch", batch.code, field, expected, actual);
      }
    }

    const studentByEnrollment = new Map(
      students.map((student) => [student.enrollmentNo, student]),
    );
    const graduateByLcn = new Map(graduates.map((g) => [g.lcn, g]));
    const passEnrollmentNos = new Set(
      batchPlan.passRows.map((row) => row.enrollmentNo),
    );

    for (const row of batchPlan.rows) {
      const student = studentByEnrollment.get(row.enrollmentNo);
      if (!student) {
        push("student", row.enrollmentNo, "exists", true, false);
        continue;
      }
      const expectedStudentFields: Record<string, unknown> = {
        name: row.displayName,
        firstName: row.firstName,
        middleName: row.middleName,
        lastName: row.lastName,
        suffix: row.suffix,
        batchCode: batch.code,
        status: row.status,
        bonusPoints: row.bonusPoints,
        bonusNote: row.bonusNote,
        scoreFWE: null,
        scoreEP: null,
        scorePAS: null,
        scoreCCST: null,
        scoreCCSM: null,
      };
      const actualStudentFields: Record<string, unknown> = {
        name: student.name,
        firstName: student.firstName,
        middleName: student.middleName,
        lastName: student.lastName,
        suffix: student.suffix,
        batchCode: student.batchCode,
        status: student.status,
        bonusPoints: student.bonusPoints,
        bonusNote: student.bonusNote,
        scoreFWE: student.scoreFWE,
        scoreEP: student.scoreEP,
        scorePAS: student.scorePAS,
        scoreCCST: student.scoreCCST,
        scoreCCSM: student.scoreCCSM,
      };
      for (const [field, expected] of Object.entries(expectedStudentFields)) {
        const actual = actualStudentFields[field];
        const ok =
          typeof expected === "number" || typeof actual === "number"
            ? sameScore(expected as number | null, actual as number | null)
            : actual === expected;
        if (!ok) push("student", row.enrollmentNo, field, expected, actual);
      }

      const actualGrades = gradeObject(student.granularGrades);
      const expectedKeys = new Set(Object.keys(row.scores));
      for (const [key, expected] of Object.entries(row.scores)) {
        const rawActual = actualGrades[key];
        const actual = typeof rawActual === "number" ? rawActual : null;
        if (!sameScore(expected, actual)) {
          push(
            "student",
            row.enrollmentNo,
            `granularGrades.${key}`,
            expected,
            actual,
          );
        }
      }
      for (const key of Object.keys(actualGrades)) {
        if (!expectedKeys.has(key)) {
          push(
            "student",
            row.enrollmentNo,
            `granularGrades.${key}`,
            undefined,
            actualGrades[key],
          );
        }
      }

      if (row.status === "GRADUATED") {
        if (!student.graduatedToLcn) {
          push(
            "student",
            row.enrollmentNo,
            "graduatedToLcn",
            "linked LCN",
            null,
          );
          continue;
        }
        const graduate = graduateByLcn.get(student.graduatedToLcn);
        if (!graduate) {
          push("graduate", student.graduatedToLcn, "exists", true, false);
          continue;
        }
        if (graduate.fromStudentEnrollmentNo !== row.enrollmentNo) {
          push(
            "graduate",
            graduate.lcn,
            "fromStudentEnrollmentNo",
            row.enrollmentNo,
            graduate.fromStudentEnrollmentNo,
          );
        }
        if (graduate.batchCode !== batch.code) {
          push(
            "graduate",
            graduate.lcn,
            "batchCode",
            batch.code,
            graduate.batchCode,
          );
        }
        // Records-only batches are expected ARCHIVED. Otherwise ARCHIVED is
        // legitimate once the license is past the configured archive grace
        // period. The official sheet proves the graduate row; current
        // public-verification state is governed by expiry policy.
        const expectedStatus = isRecordsOnlyBatch(batch.code)
          ? "ARCHIVED"
          : "GRADUATE";
        const archivedByPolicy =
          graduate.status === "ARCHIVED" &&
          graduate.expiresAt !== null &&
          graduate.expiresAt < archiveCutoff;
        if (graduate.status !== expectedStatus && !archivedByPolicy) {
          push(
            "graduate",
            graduate.lcn,
            "status",
            expectedStatus,
            graduate.status,
          );
        }
        for (const key of SCORE_KEYS) {
          if (!sameScore(row.six[key], graduate[key])) {
            push("graduate", graduate.lcn, key, row.six[key], graduate[key]);
          }
        }
        if (!sameScore(row.bonusPoints, graduate.bonusPoints)) {
          push(
            "graduate",
            graduate.lcn,
            "bonusPoints",
            row.bonusPoints,
            graduate.bonusPoints,
          );
        }
      } else if (student.graduatedToLcn !== null) {
        push(
          "student",
          row.enrollmentNo,
          "graduatedToLcn",
          null,
          student.graduatedToLcn,
        );
      }
    }

    for (const graduate of graduates) {
      if (
        graduate.status !== "ARCHIVED" &&
        graduate.fromStudentEnrollmentNo &&
        !passEnrollmentNos.has(graduate.fromStudentEnrollmentNo)
      ) {
        push(
          "graduate",
          graduate.lcn,
          "officialPassRow",
          "linked official passing row",
          graduate.fromStudentEnrollmentNo,
        );
      }
    }

    const batchIssues = issues.slice(issueStart);
    summaries.push({
      code: batch.code,
      rows: batchPlan.rows.length,
      graduates: batchPlan.passRows.length,
      failed: batchPlan.failedRows.length,
      inTraining: batchPlan.trainingRows.length,
      schemaIssues: batchIssues.filter((i) => i.scope === "batch").length,
      studentGradeIssues: batchIssues.filter((i) => i.scope === "student")
        .length,
      graduateScoreIssues: batchIssues.filter((i) => i.scope === "graduate")
        .length,
    });
  }

  const totals = {
    batches: summaries.length,
    rows: summaries.reduce((sum, row) => sum + row.rows, 0),
    graduates: summaries.reduce((sum, row) => sum + row.graduates, 0),
    failed: summaries.reduce((sum, row) => sum + row.failed, 0),
    inTraining: summaries.reduce((sum, row) => sum + row.inTraining, 0),
    issues: issues.length,
  };
  console.log("Official training grades verification");
  console.log(JSON.stringify({ totals, summaries, issues }, null, 2));
  if (issues.length > 0) {
    throw new Error(
      `Official training grades verification failed: ${issues.length} issue(s).`,
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const tables = await readDocxTables(args.docxPath);
  const plan = await buildPlan(tables);
  const validationErrors = validateRows(plan.batches.flatMap((b) => b.rows));
  if (args.verify) {
    await verifyPlan(plan);
    return;
  }
  printPlan(plan);
  if (validationErrors.length > 0) {
    console.error("Validation errors:");
    for (const error of validationErrors) console.error(`  - ${error}`);
    throw new Error("Import validation failed.");
  }
  if (!args.apply) {
    console.log("Dry run only. Re-run with --apply to write these changes.");
    return;
  }
  await applyPlan(plan);
  console.log("Official training grades import applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
