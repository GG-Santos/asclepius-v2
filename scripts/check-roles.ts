// Wave-1 gate (R4): the writer role is removed. Repo-wide sweep asserting:
//   1. The Role union in src/lib/auth.ts is exactly admin|professor|graduate.
//   2. Role defaults are "graduate" (Prisma schema, BetterAuth defaultValue,
//      session fallback).
//   3. The quoted literal "writer" appears ONLY in the enumerated
//      legacy-handling files (denial, reassignment, labels) — never in any
//      other source file, where it could re-grant access.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

const failures: string[] = [];

// Files allowed to mention "writer" (legacy denial/reassignment handling).
const ALLOWED = new Set(
  [
    "src/lib/auth.ts", // removal comment
    "src/lib/session.ts", // denial comment
    "src/app/dashboard/layout.tsx", // pending-reassignment notice comment
    "src/app/dashboard/staff/actions.ts", // writer→x conversion handling
    "src/app/dashboard/staff/page.tsx", // listing query surfaces writers
    "src/components/dashboard/staff-manager.tsx", // legacy label + disabled option
  ].map((p) => p.split("/").join(sep)),
);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "generated") continue; // prisma client output
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      yield full;
    }
  }
}

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  if (/["']writer["']/.test(text) && !ALLOWED.has(rel)) {
    failures.push(
      `${rel}: contains "writer" literal outside the legacy-handling set`,
    );
  }
}

// 1. Role union.
const auth = readFileSync(join(SRC, "lib", "auth.ts"), "utf8");
if (!/export type Role = "admin" \| "professor" \| "graduate";/.test(auth)) {
  failures.push("src/lib/auth.ts: Role union is not admin|professor|graduate");
}
// 2. Defaults.
if (!/defaultValue: "graduate"/.test(auth)) {
  failures.push(
    "src/lib/auth.ts: BetterAuth role defaultValue is not graduate",
  );
}
const schema = readFileSync(join(ROOT, "prisma", "schema.prisma"), "utf8");
if (!/role\s+String\s+@default\("graduate"\)/.test(schema)) {
  failures.push("prisma/schema.prisma: User.role default is not graduate");
}
const sessionLib = readFileSync(join(SRC, "lib", "session.ts"), "utf8");
if (!/\?\? "graduate"\) as Role/.test(sessionLib)) {
  failures.push("src/lib/session.ts: role fallback is not graduate");
}
// 3. canBlog field exists (Wave 1 schema contract for Wave 3).
if (!/canBlog\s+Boolean\s+@default\(false\)/.test(schema)) {
  failures.push("prisma/schema.prisma: User.canBlog missing");
}
if (!/FAILED/.test(schema)) {
  failures.push("prisma/schema.prisma: StudentStatus FAILED missing");
}
if (!/recertifiedAt\s+DateTime\?/.test(schema)) {
  failures.push("prisma/schema.prisma: Graduate.recertifiedAt missing");
}
if (!/quizDefs\s+Json\?/.test(schema)) {
  failures.push("prisma/schema.prisma: Batch.quizDefs missing");
}

if (failures.length > 0) {
  console.error("ROLE SWEEP FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "Role sweep passed: writer removed from the assignable set, graduate defaults in place, Wave-1 schema fields present.",
);
