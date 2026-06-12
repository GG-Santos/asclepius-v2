// Wave-2 gate (R1 structural parity): with NO saved template, the resolver
// must reproduce the pre-refactor renderers exactly — every static layer in
// the frozen legacy fixtures resolves to its original artwork URL, no layer
// is suppressed, and every overlay fill equals the legacy literal.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OVERLAY_COLOR_DEFAULTS } from "../src/lib/artifact-template/defaults";
import {
  DEFAULT_TEMPLATE,
  layerSrc,
  overlayColor,
  suppressedOverride,
} from "../src/lib/artifact-template/resolve";
import type {
  ArtifactId,
  OverlayColorKey,
} from "../src/lib/artifact-template/types";

type FixtureLayer = { kind: string; file?: string };
type ArtifactFixture = {
  artBase: string;
  layers: FixtureLayer[];
  overlays: Record<string, unknown>;
};

const fixtures = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "fixtures", "legacy-layers.json"),
    "utf8",
  ),
) as Record<string, ArtifactFixture | string>;

const failures: string[] = [];

function normalizeHex(c: string): string {
  const m = /^#([0-9a-f]{3})$/i.exec(c);
  if (!m) return c.toLowerCase();
  const [r, g, b] = m[1] ?? "";
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

// 1. Every fixture static layer resolves to its original URL, unsuppressed.
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
    const expected = `${fixture.artBase}/${layer.file}`;
    const actual = layerSrc(DEFAULT_TEMPLATE, artifact, layer.file);
    if (actual !== expected) {
      failures.push(
        `${artifact}/${layer.file}: resolves to ${actual}, expected ${expected}`,
      );
    }
    if (suppressedOverride(DEFAULT_TEMPLATE, artifact, layer.file) !== null) {
      failures.push(`${artifact}/${layer.file}: suppressed with zero config`);
    }
  }
}

// 2. Overlay fills equal the legacy literals.
const LEGACY_FILLS: Record<OverlayColorKey, string> = {
  "cert-name": "#1a1a1a",
  "cert-body": "#1a1a1a",
  "cert-lcn": "#1a1a1a",
  "license-name": "#000",
  "license-lcn": "#000",
  "license-dates": "#000",
};
for (const [key, legacy] of Object.entries(LEGACY_FILLS) as [
  OverlayColorKey,
  string,
][]) {
  const resolved = overlayColor(DEFAULT_TEMPLATE, key);
  if (normalizeHex(resolved) !== normalizeHex(legacy)) {
    failures.push(`overlay ${key}: resolves to ${resolved}, legacy ${legacy}`);
  }
  if (normalizeHex(OVERLAY_COLOR_DEFAULTS[key]) !== normalizeHex(legacy)) {
    failures.push(
      `overlay default ${key}: manifest ${OVERLAY_COLOR_DEFAULTS[key]} != legacy ${legacy}`,
    );
  }
}

if (failures.length > 0) {
  console.error("PARITY CHECK FAILED:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "Parity check passed: zero-config resolution matches the frozen legacy fixtures (layers, URLs, overlay fills).",
);
