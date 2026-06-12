// Wave-5 gate (R12/R13): SJE rollup under custom batch quiz definitions
// (7-quiz and 10-quiz), the legacy default, malformed-defs fallback, and
// promotion eligibility excluding FAILED/GRADUATED/WITHDRAWN.
import { isPromotable, rollupGraduateScores } from "../src/lib/student";
import {
  parseBatchQuizDefs,
  QUIZ_DEFS,
  type QuizDef,
  quizDefsFor,
  quizMaxTotal,
  quizToSjePct,
} from "../src/lib/student-grades";

const failures: string[] = [];

function expect(name: string, actual: unknown, wanted: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    failures.push(
      `${name}: got ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`,
    );
  }
}

// ── Legacy default: full marks on q1–q10 (800/800) → 100% SJE ────────────
const fullLegacy: Record<string, number> = {};
for (const d of QUIZ_DEFS) fullLegacy[d.key] = d.maxScore;
expect("legacy full marks → 100%", quizToSjePct(fullLegacy), 100);
expect("legacy max total", quizMaxTotal(QUIZ_DEFS), 800);
expect("legacy empty grades → null", quizToSjePct({}), null);

// ── Custom 7-quiz batch (max-sum 700): half marks → 50% ──────────────────
const seven: QuizDef[] = Array.from({ length: 7 }, (_, i) => ({
  key: `q${i + 1}`,
  label: `Q${i + 1}`,
  maxScore: 100,
  passing: 50,
}));
const halfSeven: Record<string, number> = {};
for (const d of seven) halfSeven[d.key] = 50;
expect("7-quiz half marks → 50%", quizToSjePct(halfSeven, seven), 50);
expect("7-quiz max total", quizMaxTotal(seven), 700);

// ── Custom 10-quiz batch with uneven maxima ───────────────────────────────
const ten: QuizDef[] = Array.from({ length: 10 }, (_, i) => ({
  key: `q${i + 1}`,
  label: `Q${i + 1}`,
  maxScore: i === 0 ? 200 : 50, // 200 + 9×50 = 650
  passing: 25,
}));
expect("10-quiz uneven max total", quizMaxTotal(ten), 650);
expect(
  "10-quiz uneven: 325/650 → 50%",
  quizToSjePct({ q1: 100, q2: 25, q3: 50, q4: 50, q5: 50, q6: 50 }, ten),
  50,
);

// ── Rollup: SJE = pct × 0.15 under custom defs ────────────────────────────
const rolled = rollupGraduateScores(
  {
    scoreFWE: null,
    scoreEP: null,
    scorePAS: null,
    scoreCCST: null,
    scoreCCSM: null,
    granularGrades: halfSeven,
  },
  seven,
);
expect("rollup SJE under 7-quiz defs (50% × 0.15)", rolled.scoreSJE, 7.5);

// ── Batch defs parsing: malformed input falls back to legacy ─────────────
expect("parse null → null", parseBatchQuizDefs(null), null);
expect("parse [] → null", parseBatchQuizDefs([]), null);
expect(
  "parse bad key → null",
  parseBatchQuizDefs([{ key: "x1", label: "A", maxScore: 10, passing: 5 }]),
  null,
);
expect(
  "parse passing > max → null",
  parseBatchQuizDefs([{ key: "q1", label: "A", maxScore: 10, passing: 11 }]),
  null,
);
expect(
  "parse duplicate keys → null",
  parseBatchQuizDefs([
    { key: "q1", label: "A", maxScore: 10, passing: 5 },
    { key: "q1", label: "B", maxScore: 10, passing: 5 },
  ]),
  null,
);
if (quizDefsFor(null).length !== QUIZ_DEFS.length) {
  failures.push("quizDefsFor(null) did not fall back to the legacy set");
}
const roundTrip = parseBatchQuizDefs(JSON.parse(JSON.stringify(seven)));
expect("parse valid 7-quiz defs round-trips", roundTrip?.length, 7);

// ── Promotion eligibility (R13) ───────────────────────────────────────────
expect("IN_TRAINING promotable", isPromotable("IN_TRAINING"), true);
expect("FAILED not promotable", isPromotable("FAILED"), false);
expect("GRADUATED not promotable", isPromotable("GRADUATED"), false);
expect("WITHDRAWN not promotable", isPromotable("WITHDRAWN"), false);

if (failures.length > 0) {
  console.error("QUIZ ROLLUP CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "Quiz rollup check passed: legacy + 7-quiz + uneven 10-quiz SJE math, defs parsing fallbacks, and promotion eligibility.",
);
