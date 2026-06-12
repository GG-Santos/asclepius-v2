// Wave-3 gate (R9-R11): no hardcoded duration literals may remain at the
// expiry call sites or their user-facing copy — durations must derive from
// the org expiry policy. The pluralization helper (expiry-label.ts) and the
// generic date-picker parse-syntax examples are intentionally not scanned.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FILES = [
  "src/app/dashboard/students/actions.ts",
  "src/app/dashboard/graduates/actions.ts",
  "src/components/dashboard/auto-archive.tsx",
  "src/components/dashboard/graduate-detail-actions.tsx",
  "src/components/dashboard/graduates-data-table.tsx",
  "src/components/dashboard/graduate-form.tsx",
  "src/components/dashboard/promote-student-dialog.tsx",
];

const FORBIDDEN: RegExp[] = [
  /\bone year\b/i,
  /\btwo years\b/i,
  /\+\s*1 year\b/i,
  /\b1-year\b/i,
  /\b2-year\b/i,
  /\b2\+\s*years?\b/i,
  /\bin 1 year\b/i,
  // Date arithmetic with a numeric-literal year offset at a call site.
  /setFullYear\([^)]*[+-]\s*\d+\s*\)/,
];

const failures: string[] = [];
for (const rel of FILES) {
  let text: string;
  try {
    text = readFileSync(join(ROOT, rel), "utf8");
  } catch {
    failures.push(`${rel}: file missing (enumerated call site)`);
    continue;
  }
  for (const pattern of FORBIDDEN) {
    const m = pattern.exec(text);
    if (m) {
      const line = text.slice(0, m.index).split("\n").length;
      failures.push(`${rel}:${line}: hardcoded duration "${m[0]}"`);
    }
  }
}

if (failures.length > 0) {
  console.error("EXPIRY LITERAL SCAN FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Expiry literal scan passed: ${FILES.length} call-site files free of hardcoded durations.`,
);
