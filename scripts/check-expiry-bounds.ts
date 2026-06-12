// Wave-3 gate (R12): the expiry-policy bounds validator must accept every
// in-bounds integer pair and reject out-of-bounds, non-integer, and missing
// values with field errors.
import {
  DEFAULT_EXPIRY_POLICY,
  type EXPIRY_POLICY_BOUNDS,
  validateExpiryPolicy,
} from "../src/lib/expiry-policy";

const failures: string[] = [];

function expectValid(candidate: Parameters<typeof validateExpiryPolicy>[0]) {
  const errors = validateExpiryPolicy(candidate);
  if (Object.keys(errors).length > 0) {
    failures.push(
      `expected valid: ${JSON.stringify(candidate)} → ${JSON.stringify(errors)}`,
    );
  }
}

function expectInvalid(
  candidate: Parameters<typeof validateExpiryPolicy>[0],
  field: keyof typeof EXPIRY_POLICY_BOUNDS,
) {
  const errors = validateExpiryPolicy(candidate);
  if (!errors[field]) {
    failures.push(
      `expected ${field} error: ${JSON.stringify(candidate)} → ${JSON.stringify(errors)}`,
    );
  }
}

// Defaults are valid and equal to the documented values.
expectValid(DEFAULT_EXPIRY_POLICY);
if (
  DEFAULT_EXPIRY_POLICY.licenseValidityYears !== 1 ||
  DEFAULT_EXPIRY_POLICY.archiveGraceYears !== 2
) {
  failures.push("defaults drifted from 1yr validity / 2yr grace");
}

// Bounds edges.
expectValid({ licenseValidityYears: 1, archiveGraceYears: 0 });
expectValid({ licenseValidityYears: 10, archiveGraceYears: 10 });
expectValid({ licenseValidityYears: 3, archiveGraceYears: 5 });

// Out of bounds.
expectInvalid(
  { licenseValidityYears: 0, archiveGraceYears: 2 },
  "licenseValidityYears",
);
expectInvalid(
  { licenseValidityYears: 11, archiveGraceYears: 2 },
  "licenseValidityYears",
);
expectInvalid(
  { licenseValidityYears: 1, archiveGraceYears: -1 },
  "archiveGraceYears",
);
expectInvalid(
  { licenseValidityYears: 1, archiveGraceYears: 11 },
  "archiveGraceYears",
);

// Non-integers and missing values.
expectInvalid(
  { licenseValidityYears: 2.5, archiveGraceYears: 2 },
  "licenseValidityYears",
);
expectInvalid(
  { licenseValidityYears: Number.NaN, archiveGraceYears: 2 },
  "licenseValidityYears",
);
expectInvalid({ archiveGraceYears: 2 }, "licenseValidityYears");
expectInvalid({ licenseValidityYears: 1 }, "archiveGraceYears");

if (failures.length > 0) {
  console.error("EXPIRY BOUNDS CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("Expiry bounds check passed: 12 validator assertions.");
