// Wave-1 gate: the artifact-template manifest must account for every static
// layer in the frozen legacy fixtures — each static layer is either
// replaceable, protected (QR logos), or suppressible via a text element —
// and QR-logo layers must be absent from the replaceable set.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROTECTED_LAYERS,
  REPLACEABLE_LAYERS,
  TEXT_ELEMENTS,
} from "../src/lib/artifact-template/defaults";
import type { ArtifactId } from "../src/lib/artifact-template/types";

type FixtureLayer = { kind: string; file?: string };
type Fixture = Record<string, { layers: FixtureLayer[] } | string>;

const fixtures = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "fixtures", "legacy-layers.json"),
    "utf8",
  ),
) as Fixture;

const failures: string[] = [];
const replaceable = new Set(
  REPLACEABLE_LAYERS.map((l) => `${l.artifact}/${l.file}`),
);
const suppressible = new Set(
  TEXT_ELEMENTS.filter((e) => e.suppressesLayer).map(
    (e) => `${e.artifact}/${e.suppressesLayer}`,
  ),
);

// Signature and warning layers are visibility-controlled, never replaceable.
const EXEMPT_KINDS = new Set(["signature", "warning"]);

for (const artifact of [
  "certificate",
  "license-front",
  "license-back",
] as ArtifactId[]) {
  const fixture = fixtures[artifact];
  if (!fixture || typeof fixture === "string") {
    failures.push(`${artifact}: fixture missing`);
    continue;
  }
  for (const layer of fixture.layers) {
    if (layer.kind !== "static" || !layer.file) continue;
    const key = `${artifact}/${layer.file}`;
    const isProtected = PROTECTED_LAYERS[artifact].includes(layer.file);
    if (isProtected) {
      if (replaceable.has(key)) {
        failures.push(`${key}: QR-protected layer is in the replaceable set`);
      }
      continue;
    }
    if (!replaceable.has(key)) {
      failures.push(`${key}: static layer missing from replaceable set`);
    }
  }
  // Static layers covered by EXEMPT kinds in the stacks above are kind
  // "signature"/"warning" entries, skipped by the static filter already.
  void EXEMPT_KINDS;
}

// Every suppressesLayer must reference a real static layer in its artifact.
for (const key of suppressible) {
  const [artifact, file] = key.split("/", 2) as [ArtifactId, string];
  const fixture = fixtures[artifact];
  if (!fixture || typeof fixture === "string") continue;
  const exists = fixture.layers.some(
    (l) => l.kind === "static" && l.file === file,
  );
  if (!exists) {
    failures.push(`${key}: suppressesLayer does not match any static layer`);
  }
}

// QR-logo layers must also not appear in any suppressesLayer.
for (const [artifact, files] of Object.entries(PROTECTED_LAYERS)) {
  for (const file of files) {
    if (suppressible.has(`${artifact}/${file}`)) {
      failures.push(`${artifact}/${file}: QR-protected layer is suppressible`);
    }
  }
}

if (failures.length > 0) {
  console.error("MANIFEST CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  `Manifest check passed: ${REPLACEABLE_LAYERS.length} replaceable layers, ${TEXT_ELEMENTS.length} text elements, QR layers protected.`,
);
