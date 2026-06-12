// Wave-1 gate (R12): golden vectors for the assessment-scheme math —
// schemeless parity by value, B8-style total-points (incl. bonus crossing
// the threshold and legacy component-weighted six), FWE 300+700 grouping,
// NOI+MOI, missing policies, SJE bonus clamp, and the zero-entered bonus edge.
import {
  buildLegacyComponentScheme,
  computeSchemeResult,
  type GradingScheme,
  parseGradingScheme,
  parseSchemeScores,
  schemeTotalMax,
} from "../src/lib/assessment-scheme";
import { rollupGraduateScores } from "../src/lib/student";
import { QUIZ_DEFS } from "../src/lib/student-grades";

const failures: string[] = [];

function expect(name: string, actual: unknown, wanted: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(
      `${name}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`,
    );
  }
}

// ── B8 (ERA2): total-points 2100/1400 ────────────────────────────────────
const b8: GradingScheme = buildLegacyComponentScheme(
  [
    ...Array.from({ length: 10 }, (_, i) => ({
      key: `q${i + 1}`,
      label: `Q${i + 1}`,
      group: "SJE" as const,
      maxScore: 60, // 600 quiz points
    })),
    { key: "fwe-a", label: "FWE (300)", group: "FWE", maxScore: 300 },
    { key: "fwe-b", label: "FWE (700)", group: "FWE", maxScore: 700 },
    { key: "eqe", label: "Equipment Examination", group: "EP", maxScore: 100 },
    { key: "cct", label: "Critical Care Trauma", group: "CCST", maxScore: 200 },
    {
      key: "ccm",
      label: "Critical Care Medical",
      group: "CCSM",
      maxScore: 200,
    },
  ],
  { mode: "total-points", passingTotal: 1400, missingAsZero: false },
);
expect("B8 total max", schemeTotalMax(b8), 2100);

// Round-trip through the validator.
expect(
  "B8 parses",
  parseGradingScheme(JSON.parse(JSON.stringify(b8)))?.components.length,
  15,
);

// Student: every quiz 50/60 (=500), FWE 250+550 (=800), EQE 80, CCT 150, CCM 160.
const b8Scores: Record<string, number | null> = {};
for (let i = 1; i <= 10; i++) b8Scores[`q${i}`] = 50;
Object.assign(b8Scores, {
  "fwe-a": 250,
  "fwe-b": 550,
  eqe: 80,
  cct: 150,
  ccm: 160,
});
// total = 500+800+80+150+160 = 1690 → pass; displayed six are independent
// category contributions, not 1690/2100 rescaling. This intentionally omits
// PAS to exercise legacy flat-scheme normalization to 100%.
const b8r = computeSchemeResult(b8, b8Scores, null);
expect("B8 total", b8r.total, 1690);
expect("B8 verdict", b8r.verdict, "pass");
expect("B8 FWE component contribution", b8r.six.scoreFWE, 9.52);
expect("B8 SJE component contribution", b8r.six.scoreSJE, 14.72);
expect("B8 EP component contribution", b8r.six.scoreEP, 9.41);
expect("B8 CCST component contribution", b8r.six.scoreCCST, 22.06);
expect("B8 CCSM component contribution", b8r.six.scoreCCSM, 23.53);
// PAS absent from the scheme → stays null (blank, "5 of 6").
expect("B8 PAS null", b8r.six.scorePAS, null);

// Bonus crossing the threshold: total 1350 + bonus 66 = 1416 >= 1400 → pass.
const b8Low: Record<string, number | null> = { ...b8Scores, ccm: -180 + 160 };
// Easier: rebuild with quizzes at 41 → 410, FWE 800, EQE 80, CCT 30, CCM 30 = 1350
const b8LowScores: Record<string, number | null> = {};
for (let i = 1; i <= 10; i++) b8LowScores[`q${i}`] = 41;
Object.assign(b8LowScores, {
  "fwe-a": 250,
  "fwe-b": 550,
  eqe: 80,
  cct: 30,
  ccm: 30,
});
void b8Low;
const noBonus = computeSchemeResult(b8, b8LowScores, null);
const withBonus = computeSchemeResult(b8, b8LowScores, 66);
expect("B8 1350 no bonus fails", noBonus.verdict, "fail");
expect("B8 1350+66 passes", withBonus.verdict, "pass");
expect("B8 bonus applied", withBonus.bonusApplied, 66);

// Missing component under the DEFAULT policy → incomplete.
const b8Missing = { ...b8Scores, ccm: null };
expect(
  "B8 missing default → incomplete",
  computeSchemeResult(b8, b8Missing, null).verdict,
  "incomplete",
);
// Same under missing-as-zero → graded (total drops by 160).
const b8Zero: GradingScheme = { ...b8, missingAsZero: true };
const zr = computeSchemeResult(b8Zero, b8Missing, null);
expect("B8 missing-as-zero total", zr.total, 1530);
expect("B8 missing-as-zero verdict", zr.verdict, "pass");

// ── B9-style weighted-six with split FWE (300+700) and PAS = NOI+MOI ─────
const b9: GradingScheme = buildLegacyComponentScheme(
  [
    { key: "fwe-a", label: "FWE (300)", group: "FWE", maxScore: 300 },
    { key: "fwe-b", label: "FWE (700)", group: "FWE", maxScore: 700 },
    ...Array.from({ length: 10 }, (_, i) => ({
      key: `q${i + 1}`,
      label: `Q${i + 1}`,
      group: "SJE" as const,
      maxScore: QUIZ_DEFS[i]?.maxScore ?? 50,
    })),
    { key: "eqe", label: "Equipment", group: "EP", maxScore: 100 },
    { key: "noi", label: "PA — NOI", group: "PAS", maxScore: 100 },
    { key: "moi", label: "PA — MOI", group: "PAS", maxScore: 100 },
    { key: "cct", label: "CC Trauma", group: "CCST", maxScore: 100 },
    { key: "ccm", label: "CC Medical", group: "CCSM", maxScore: 100 },
  ],
  { mode: "weighted-six" },
);
// Full marks everywhere → six = the canonical weights, total 100, pass.
const b9Full: Record<string, number | null> = {};
for (const c of b9.components) b9Full[c.key] = c.maxScore;
const b9r = computeSchemeResult(b9, b9Full, null);
expect("B9 full FWE", b9r.six.scoreFWE, 10);
expect("B9 full PAS (NOI+MOI)", b9r.six.scorePAS, 15);
expect("B9 full total", b9r.total, 100);
expect("B9 verdict", b9r.verdict, "pass");

// FWE split grouping: 150/300 + 350/700 = 500/1000 → 5.0 weighted points.
const b9Half = { ...b9Full, "fwe-a": 150, "fwe-b": 350 };
expect(
  "B9 split FWE halves",
  computeSchemeResult(b9, b9Half, null).six.scoreFWE,
  5,
);

// Schemeless parity by VALUE: the b9 quiz components mirror legacy q1–q10,
// so the SJE points must equal the legacy rollup for identical inputs.
const legacyGrades: Record<string, number> = {};
for (const d of QUIZ_DEFS) legacyGrades[d.key] = Math.round(d.maxScore / 2);
const legacySix = rollupGraduateScores({
  scoreFWE: null,
  scoreEP: null,
  scorePAS: null,
  scoreCCST: null,
  scoreCCSM: null,
  granularGrades: legacyGrades,
});
const schemeSJE = computeSchemeResult(
  { ...b9, missingAsZero: true },
  { ...legacyGrades },
  null,
).six.scoreSJE;
if (
  legacySix.scoreSJE === null ||
  schemeSJE === null ||
  Math.abs(legacySix.scoreSJE - schemeSJE) > 0.01
) {
  failures.push(
    `schemeless parity: legacy SJE ${legacySix.scoreSJE} != scheme SJE ${schemeSJE}`,
  );
}

// ── SJE bonus clamp + zero-entered edge (weighted-six) ────────────────────
const sjeNearMax: Record<string, number | null> = { ...b9Full };
sjeNearMax.q1 = (QUIZ_DEFS[0]?.maxScore ?? 40) - 10; // 10 short of max
const clamped = computeSchemeResult(b9, sjeNearMax, 66);
expect("SJE bonus clamped to gap", clamped.bonusApplied, 10);
expect("SJE clamped score", clamped.six.scoreSJE, 14.81);

const nothingEntered: Record<string, number | null> = {};
for (const c of b9.components) nothingEntered[c.key] = null;
const ghost = computeSchemeResult(b9, nothingEntered, 66);
expect("zero-entered + bonus → incomplete", ghost.verdict, "incomplete");
expect("zero-entered bonus not applied", ghost.bonusApplied, 0);

// ── Validation rejections (R1) ────────────────────────────────────────────
expect(
  "reject empty components",
  parseGradingScheme({ mode: "weighted-six", components: [] }),
  null,
);
expect(
  "reject bad group",
  parseGradingScheme({
    mode: "weighted-six",
    components: [{ key: "x", label: "X", group: "NOPE", maxScore: 10 }],
  }),
  null,
);
expect(
  "reject passingTotal > max",
  parseGradingScheme({
    mode: "total-points",
    passingTotal: 999,
    components: [{ key: "a", label: "A", group: "FWE", maxScore: 100 }],
  }),
  null,
);
expect(
  "reject duplicate keys",
  parseGradingScheme({
    mode: "weighted-six",
    components: [
      { key: "a", label: "A", group: "FWE", maxScore: 100 },
      { key: "a", label: "B", group: "EP", maxScore: 100 },
    ],
  }),
  null,
);

// parseSchemeScores filters to scheme keys.
expect(
  "scores filtered to scheme keys",
  parseSchemeScores(
    { "fwe-a": 100, junk: 5 },
    buildLegacyComponentScheme(
      [{ key: "fwe-a", label: "A", group: "FWE", maxScore: 300 }],
      { mode: "weighted-six" },
    ),
  ),
  { "fwe-a": 100 },
);

if (failures.length > 0) {
  console.error("SCHEME MATH CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "Scheme math check passed: B8 total-points (bonus, missing policies, component-weighted six), B9 split groups, schemeless SJE parity, clamps, validation rejections.",
);
